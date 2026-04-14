-- Rename enum value in PostgreSQL for Role
ALTER TYPE "Role" RENAME VALUE 'OWNER' TO 'USER';

-- Ensure default aligns with new enum value
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
