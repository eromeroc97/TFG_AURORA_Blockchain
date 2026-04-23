#!/bin/sh

set -e

echo "[init] Waiting for database to be ready..."
until pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}"; do
  echo "[init] Database not ready, waiting..."
  sleep 2
done
echo "[init] Database is ready"

export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

FIRST_RUN="${INIT_ON_STARTUP:-true}"

if [ "$FIRST_RUN" = "true" ]; then
  echo "[init] First run detected - running migrations and seed..."
  npx prisma migrate deploy --schema=./prisma/schema.prisma
  
  echo "[init] Running seed..."
  npx tsx src/prisma/seed.ts || echo "[init] Seed completed"

  exec node dist/src/main
fi

MIGRATION_STATUS=$(npx prisma migrate status --schema=./prisma/schema.prisma 2>&1)

if echo "$MIGRATION_STATUS" | grep -q "Pending migrations"; then
  echo "[init] Pending migrations detected - running migrate deploy..."
  npx prisma migrate deploy --schema=./prisma/schema.prisma
else
  echo "[init] Database up to date"
fi

echo "[init] Starting application..."
exec node dist/src/main