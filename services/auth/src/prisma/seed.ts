import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import axios from 'axios';
import * as argon2 from 'argon2';

async function main() {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		throw new Error('DATABASE_URL is not defined in environment variables.');
	}

	const adapter = new PrismaPg({ connectionString: databaseUrl });

	const prisma = new PrismaClient({
		adapter,
	});

	async function getAdminDid() {
		const fallbackDid = 'did:firefly:offline-generated-admin';
		const baseUrl = process.env.FIREFLY_API_URL;

		if (!baseUrl) {
			return fallbackDid;
		}

		try {
			const statusRes = await axios.get(`${baseUrl}/status`);
			const orgId = statusRes.data.org.id;
			const defaultKey = statusRes.data?.org?.verifiers?.[0]?.value;

			const key =
				defaultKey ??
				((await axios.get(`${baseUrl}/verifiers`)).data?.[0]?.value);

			const identityRes = await axios.post(`${baseUrl}/identities`, {
				name: 'admin_global',
				type: 'custom',
				parent: orgId,
				key,
			});

			const did = identityRes.data?.did ?? identityRes.data?.id;

			if (typeof did === 'string' && did.length > 0) {
				return did;
			}
		} catch (error) {
			const axiosError = error as { response?: { data?: unknown }; message?: string };
			console.error('[seed] FireFly Error Details:', axiosError.response?.data || axiosError.message);
			return fallbackDid;
		}

		return fallbackDid;
	}

	try {
		const passwordHash = await argon2.hash('Admin123!');
		const did = await getAdminDid();

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

		console.log(`[seed] GLOBAL_ADMIN upserted successfully: ${createdAdmin.email} (${createdAdmin.id})`);
	} catch (error) {
		console.error('[seed] Error while running database seed', error);
	} finally {
		await prisma.$disconnect();
	}
}

void main();
