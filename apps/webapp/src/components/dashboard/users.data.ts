/**
 * Usuario del dashboard.
 */
export type User = {
	/** ID único */
	id: string;
	/** Email */
	email: string;
	/** Nombre */
	name: string;
	/** Rol */
	role: 'USER' | 'AUDITOR' | 'ADMIN' | 'GLOBAL_ADMIN';
	/** Estado */
	status: 'ACTIVE' | 'PENDING' | 'PASSBLOCK' | 'REVOKED';
	/** Fecha de creación */
	createdAt: string;
}

/**
 * Datos de usuarios (mock para desarrollo).
 */
export const USERS_MOCK: User[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user1@aurora.local',
    name: 'Juan García',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: '2024-01-15',
  },
  {
    id: '71ac8f45-8d9f-4e03-bfdf-3f0c81a4e7f4',
    email: 'auditor@aurora.local',
    name: 'María López',
    role: 'AUDITOR',
    status: 'ACTIVE',
    createdAt: '2024-01-10',
  },
  {
    id: 'f46f4f2f-cf3d-4170-a957-6b3f257cf8a5',
    email: 'admin@aurora.local',
    name: 'Carlos Rodríguez',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2023-12-01',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user2@aurora.local',
    name: 'Ana Martínez',
    role: 'USER',
    status: 'PENDING',
    createdAt: '2024-02-05',
  },
  {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    email: 'user3@aurora.local',
    name: 'Pedro Sánchez',
    role: 'USER',
    status: 'REVOKED',
    createdAt: '2024-01-20',
  },
  {
    id: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
    email: 'auditor2@aurora.local',
    name: 'Isabel Fernández',
    role: 'AUDITOR',
    status: 'ACTIVE',
    createdAt: '2024-01-22',
  },
]
