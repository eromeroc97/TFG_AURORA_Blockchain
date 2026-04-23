import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import axios from 'axios';
import * as argon2 from 'argon2';

const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@uclm.es';
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';

async function main() {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		throw new Error('DATABASE_URL is not defined in environment variables.');
	}

	const adapter = new PrismaPg({ connectionString: databaseUrl });

	const prisma = new PrismaClient({
		adapter,
	});

	async function getAdminDid(adminId: string) {
		const fallbackDid = `did:firefly:${adminId}`;
		const baseUrl = process.env.FIREFLY_API_URL;

		if (!baseUrl) {
			return fallbackDid;
		}

		try {
			const orgRes = await axios.get(`${baseUrl}/identities?type=org`);
			const orgId = orgRes.data?.[0]?.id;
			const defaultKey = orgRes.data?.[0]?.verifiers?.[0]?.value;

			const verifierRes = await axios.get(`${baseUrl}/verifiers`);
			const key = defaultKey ?? verifierRes.data?.[0]?.value;

			const identityRes = await axios.post(`${baseUrl}/identities`, {
				name: adminId,
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
		const passwordHash = await argon2.hash(SEED_ADMIN_PASSWORD);

		const createdAdmin = await prisma.user.create({
			data: {
				email: SEED_ADMIN_EMAIL,
				passwordHash,
				role: Role.GLOBAL_ADMIN,
				status: UserStatus.ACTIVE,
				did: null,
				isActive: true,
			},
			select: {
				id: true,
				email: true,
				role: true,
				did: true,
			},
		});

		const did = await getAdminDid(createdAdmin.id);

		await prisma.user.update({
			where: { id: createdAdmin.id },
			data: { did },
		});

		console.log(`[seed] GLOBAL_ADMIN created: ${createdAdmin.email} (${createdAdmin.id}) DID: ${did}`);
	} catch (error) {
		console.error('[seed] Error while running database seed', error);
	} finally {
		await prisma.$disconnect();
	}
}

void main();
