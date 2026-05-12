import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { randomBytes, createCipheriv } from 'crypto';
import { generateKeyPairSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  console.log('Starting identity regeneration...');

  const masterKeyBase64 = process.env.CRYPTO_MASTER_KEY;
  if (!masterKeyBase64) {
    throw new Error('CRYPTO_MASTER_KEY is not defined');
  }
  const masterKey = Buffer.from(masterKeyBase64, 'base64');
  if (masterKey.length !== KEY_LENGTH) {
    throw new Error('CRYPTO_MASTER_KEY must be 32 bytes');
  }

  function encryptPrivateKey(privateKeyPem: string): { ciphertext: string; iv: string; authTag: string } {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, masterKey, iv, { authTagLength: AUTH_TAG_LENGTH });
    
    const encrypted = Buffer.concat([
      cipher.update(privateKeyPem, 'utf8'),
      cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  function generateEd25519KeyPair(): { publicKey: string; privateKey: string } {
    const keyPair = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    
    return {
      publicKey: keyPair.publicKey as string,
      privateKey: keyPair.privateKey as string,
    };
  }

  const usersWithIdentity = await prisma.user.findMany({
    where: {
      identityId: { not: null },
    },
    select: {
      id: true,
      email: true,
      identityId: true,
    },
  });

  console.log(`Found ${usersWithIdentity.length} users with identity`);

  let updated = 0;
  let failed = 0;

  for (const user of usersWithIdentity) {
    try {
      console.log(`Regenerating identity for user: ${user.email} (${user.id})`);
      
      const keyPair = generateEd25519KeyPair();
      const encrypted = encryptPrivateKey(keyPair.privateKey);
      
      await prisma.identity.update({
        where: { id: user.identityId! },
        data: {
          publicKey: keyPair.publicKey,
          privateKeyCiphertext: encrypted.ciphertext,
          privateKeyIv: encrypted.iv,
          privateKeyAuthTag: encrypted.authTag,
        },
      });
      
      console.log(`  ✓ Identity regenerated for ${user.email}`);
      updated++;
    } catch (error) {
      console.error(`  ✗ Failed for ${user.email}:`, error instanceof Error ? error.message : error);
      failed++;
    }
  }

  console.log(`\n--- Results ---`);
  console.log(`Total: ${usersWithIdentity.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });