import 'dotenv/config';
import axios, { AxiosInstance } from 'axios';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

interface FireflyStatus {
  org: {
    id: string;
    did: string;
    verifiers?: Array<{ type: string; value: string }>;
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const fireflyUrl = process.env.FIREFLY_API_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined in environment variables.');
  }
  if (!fireflyUrl) {
    throw new Error('FIREFLY_API_URL is not defined in environment variables.');
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  const client: AxiosInstance = axios.create({ timeout: 300000 });

  try {
    const statusRes = await client.get<FireflyStatus>(`${fireflyUrl}/status`);
    const orgId = statusRes.data.org.id;
    const verifierKey = statusRes.data.org.verifiers?.[0]?.value;

    if (!verifierKey) {
      throw new Error('No blockchain key available from FireFly');
    }

    console.log(`[seed] FireFly org initialized: ${orgId}`);

    const passwordHash = await argon2.hash('Admin123!');

    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@uclm.es' },
      select: { id: true },
    });

    const adminId = existingAdmin?.id ?? randomUUID();
    const identityName = `AURORA-${adminId}`;

    // Extract base URL (remove /namespaces/* path)
    const baseUrl = fireflyUrl.split('/namespaces/')[0];

    console.log(`[seed] Submitting identity claim for ${identityName}...`);
    await client.post(
      `${fireflyUrl}/identities`,
      {
        name: identityName,
        type: 'custom',
        parent: orgId,
        key: verifierKey,
      },
    );

    const maxPolls = 15;
    const pollDelayMs = 3000;
    let did: string | null = null;

    for (let attempt = 1; attempt <= maxPolls; attempt++) {
      try {
        // Get ALL network identities without filtering
        const checkRes = await client.get<Array<{ did: string; name: string; id: string; namespace: string }>>(
          `${baseUrl}/network/identities`,
        );

        console.log(`[seed] Poll ${attempt}: Found ${checkRes.data?.length ?? 0} network identities`);
        
        // Debug: show all identity names
        const allNames = checkRes.data?.map(i => ({ name: i.name, namespace: i.namespace, did: i.did?.slice(0, 20) + '...' })) ?? [];
        if (allNames.length > 0) {
          console.log(`[seed] All network identities:`, JSON.stringify(allNames));
        }

        const confirmedIdentity = checkRes.data?.find((i) => i.name === identityName && i.did);

        if (confirmedIdentity) {
          did = confirmedIdentity.did;
          console.log(`[seed] Success: Identity confirmed on blockchain on attempt ${attempt}: ${did}`);
          break;
        }
      } catch (error: unknown) {
        const err = error as { response?: { status: number; data?: unknown }; message?: string };
        console.log(`[seed] Poll ${attempt} error: ${err.response?.status ?? err.message ?? 'unknown'}`);
        if (err.response?.data) {
          console.log(`[seed] Error response:`, JSON.stringify(err.response.data));
        }
      }

      console.log(`[seed] Waiting for blockchain confirmation... (${attempt}/${maxPolls})`);
      await new Promise((resolve) => setTimeout(resolve, pollDelayMs));
    }

    if (!did) {
      throw new Error('Identity creation failed: no DID obtained after polling');
    }

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