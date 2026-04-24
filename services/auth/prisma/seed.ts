import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined in environment variables.');
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await argon2.hash('Admin123!');

    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@uclm.es' },
      select: { id: true },
    });

    const adminId = existingAdmin?.id ?? randomUUID();
    const identityName = 'AURORA-GLOBAL-ADMIN';
    const did = `did:firefly:ns/default/${identityName}`;

    console.log(`[seed] Creating admin user with DID: ${did}`);

    const createdAdmin = await prisma.user.upsert({
      where: { email: 'admin@uclm.es' },
      update: {
        passwordHash,
        role: Role.GLOBAL_ADMIN,
        status: UserStatus.ACTIVE,
        did,
        isActive: true,
      },
      create: {
        id: adminId,
        email: 'admin@uclm.es',
        passwordHash,
        role: Role.GLOBAL_ADMIN,
        status: UserStatus.ACTIVE,
        did,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        did: true,
      },
    });

    console.log(`[seed] GLOBAL_ADMIN upserted: ${createdAdmin.email} (${createdAdmin.id}) DID: ${createdAdmin.did}`);
  } catch (error) {
    console.error('[seed] Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

void main();