import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, UserStatus, IdentityType } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID, randomBytes, createCipheriv, generateKeyPairSync } from 'crypto';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const masterKeyBase64 = process.env.CRYPTO_MASTER_KEY;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined in environment variables.');
  }

  if (!masterKeyBase64) {
    throw new Error('CRYPTO_MASTER_KEY is not defined in environment variables.');
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await argon2.hash('Admin123!');

    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@uclm.es' },
      select: { id: true },
    });

    if (existingAdmin) {
      console.log(`[seed] GLOBAL_ADMIN already exists: ${existingAdmin.id}`);
      return;
    }

    const { publicKey, privateKey } = generateEd25519KeyPair();
    const encrypted = encryptPrivateKey(privateKey, masterKeyBase64);

    console.log(`[seed] Creating GLOBAL_ADMIN with Identity`);

    const identity = await prisma.identity.create({
      data: {
        type: IdentityType.USER,
        publicKey,
        privateKeyCiphertext: encrypted.ciphertext,
        privateKeyIv: encrypted.iv,
        privateKeyAuthTag: encrypted.authTag,
        keyRotationTimestamp: new Date(),
      },
    });

    const createdAdmin = await prisma.user.create({
      data: {
        identityId: identity.id,
        email: 'admin@uclm.es',
        passwordHash,
        role: Role.GLOBAL_ADMIN,
        status: UserStatus.ACTIVE,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    console.log(`[seed] GLOBAL_ADMIN upserted: ${createdAdmin.email} (${createdAdmin.id})`);
  } catch (error) {
    console.error('[seed] Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function generateEd25519KeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }) as string,
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
  };
}

function encryptPrivateKey(
  privateKeyPem: string,
  masterKeyBase64: string,
): { ciphertext: string; iv: string; authTag: string } {
  const masterKey = Buffer.from(masterKeyBase64, 'base64');
  const iv = randomBytes(16);

  const cipher = createCipheriv('aes-256-gcm', masterKey, iv, {
    authTagLength: 16,
  });

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

void main();