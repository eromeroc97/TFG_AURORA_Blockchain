-- Extend user status lifecycle with password-expired blocking state.
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PASSBLOCK';

-- Track the last password rotation timestamp for every user.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Enforce password rotation policy in-row (90 days) and normalize passwordChangedAt to 00:00.
CREATE OR REPLACE FUNCTION public.apply_password_rotation_policy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW."passwordChangedAt" := date_trunc('day', COALESCE(NEW."passwordChangedAt", CURRENT_TIMESTAMP));
  ELSIF NEW."passwordHash" IS DISTINCT FROM OLD."passwordHash" THEN
    NEW."passwordChangedAt" := date_trunc('day', CURRENT_TIMESTAMP);
  ELSE
    NEW."passwordChangedAt" := date_trunc('day', NEW."passwordChangedAt");
  END IF;

  IF CURRENT_DATE - NEW."passwordChangedAt"::date >= 90 THEN
    NEW."status" := 'PASSBLOCK';
    NEW."isActive" := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_password_rotation_policy ON "User";
CREATE TRIGGER trg_user_password_rotation_policy
BEFORE INSERT OR UPDATE ON "User"
FOR EACH ROW
EXECUTE FUNCTION public.apply_password_rotation_policy();

-- Daily enforcement at 00:00 (database-side) when pg_cron is available.
CREATE OR REPLACE FUNCTION public.enforce_password_rotation_daily()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE "User"
  SET "status" = 'PASSBLOCK',
      "isActive" = false
  WHERE CURRENT_DATE - "passwordChangedAt"::date >= 90
    AND "status" <> 'PASSBLOCK';
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron extension is not available: %', SQLERRM;
    END;

    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
      PERFORM cron.unschedule(jobid)
      FROM cron.job
      WHERE jobname = 'enforce_password_rotation_daily';

      PERFORM cron.schedule(
        'enforce_password_rotation_daily',
        '0 0 * * *',
        $job$SELECT public.enforce_password_rotation_daily();$job$
      );
    END IF;
  END IF;
END;
$$;

-- Apply the rule immediately as well.
SELECT public.enforce_password_rotation_daily();
