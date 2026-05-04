-- Remove actorEmail column from Notification table
-- This column is redundant - actor email can be retrieved from the User table using actorId

ALTER TABLE "Notification" DROP COLUMN IF EXISTS "actorEmail";