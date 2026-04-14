import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';
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

	async function getFireflyDid() {
		const fallbackDid = 'did:firefly:offline-generated-org';
		const baseUrl = process.env.FIREFLY_API_URL;

		if (!baseUrl) {
			return fallbackDid;
		}

		try {
			const orgRes = await axios.get(`${process.env.FIREFLY_API_URL}/identities?type=org`);
			const did = orgRes.data?.[0]?.did;

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
		const did = await getFireflyDid();

		const createdAdmin = await prisma.user.upsert({
			where: { email: 'admin@uclm.es' },
			update: {
				passwordHash,
				role: Role.GLOBAL_ADMIN,
				did,
			},
			create: {
				email: 'admin@uclm.es',
				passwordHash,
				role: Role.GLOBAL_ADMIN,
				did,
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
