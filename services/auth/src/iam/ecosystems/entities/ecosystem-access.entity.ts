import { AccessRole } from '@prisma/client';

export class EcosystemAccess {
	id!: string;
	ecosystemId!: string;
	userId!: string;
	role!: AccessRole;
	createdAt!: Date;
	updatedAt!: Date;
}

export class EcosystemAccessWithUser extends EcosystemAccess {
	userEmail!: string;
	userStatus!: string;
}

export class EcosystemWithAccessType {
	id!: string;
	name!: string;
	ownerId!: string;
	status!: string;
	latitude!: number | null;
	longitude!: number | null;
	isOnline!: boolean;
	lastSeen!: Date | null;
	createdAt!: Date;
	updatedAt!: Date;
	accessType!: 'OWNER' | 'DELEGATED';
	accessRole?: AccessRole;
	isShared?: boolean;
}