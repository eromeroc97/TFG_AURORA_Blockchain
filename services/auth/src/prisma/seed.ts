import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';
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

	try {
		const existingGlobalAdmin = await prisma.user.findFirst({
			where: { role: Role.GLOBAL_ADMIN },
			select: { id: true, email: true },
		});

		if (existingGlobalAdmin) {
			console.log(
				`[seed] GLOBAL_ADMIN already exists: ${existingGlobalAdmin.email} (${existingGlobalAdmin.id})`,
			);
			return;
		}

		const passwordHash = await argon2.hash('Admin123!');

		const createdAdmin = await prisma.user.create({
			data: {
				email: 'admin@aurora.local',
				passwordHash,
				role: Role.GLOBAL_ADMIN,
			},
			select: {
				id: true,
				email: true,
				role: true,
			},
		});

		console.log(`[seed] GLOBAL_ADMIN created successfully: ${createdAdmin.email}`);
	} catch (error) {
		console.error('[seed] Error while running database seed', error);
	} finally {
		await prisma.$disconnect();
	}
}

void main();
