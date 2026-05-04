-- AddECOSYSTEM_DELEGATION_RESPONSE
-- This migration adds the ECOSYSTEM_DELEGATION_RESPONSE notification type for notifying ecosystem owners when their delegation requests are accepted or rejected.

ALTER TYPE "NotificationType" ADD VALUE 'ECOSYSTEM_DELEGATION_RESPONSE';