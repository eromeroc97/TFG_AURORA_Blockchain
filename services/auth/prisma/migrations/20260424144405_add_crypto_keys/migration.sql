-- Add crypto keys to User table
ALTER TABLE "User" ADD COLUMN "publicKey" TEXT;
ALTER TABLE "User" ADD COLUMN "encryptedPrivateKey" TEXT;
ALTER TABLE "User" ADD COLUMN "keyRotationTimestamp" TIMESTAMP;