# Arranque rapido del entorno (Docker + build + seed)

Esta guia esta pensada para replicar el entorno de forma sencilla.

## 1) Prerrequisitos

- Docker Desktop levantado.
- Node.js + npm instalados (para construir la webapp en `apps/webapp`).

## 2) Arranque limpio recomendado

Desde la raiz del repo:

```powershell
# 1. Limpiar contenedores/volumenes (opcional, pero recomendado en primer arranque)
docker compose down -v --remove-orphans

# 2. Construir la webapp (Caddy sirve apps/webapp/dist)
Set-Location apps/webapp
npm ci
npm run build
Set-Location ../..

# 3. Construir imagenes de servicios y levantar stack
docker compose up -d --build
```

## 3) Construccion de todo (resumen)

Que se construye en el flujo anterior:

- Frontend: `apps/webapp` -> genera `apps/webapp/dist`.
- Backend auth: imagen Docker de `services/auth` (build multi-stage).
- Backend iot-manager: imagen Docker de `services/iot-manager` (build multi-stage).
- Infra: Traefik, Postgres, Mongo, Redis, Mailpit, Seq (imagenes oficiales).

Si ya tienes la webapp construida y solo quieres reconstruir contenedores:

```powershell
docker compose up -d --build
```

## 4) Seeding

### 4.1 Seed automatico de infraestructura (al crear volumenes nuevos)

Al primer arranque con volumenes vacios:

- Postgres ejecuta `infra/postgres/init.sql` automaticamente.
- Mongo ejecuta `infra/mongo/init.js` automaticamente.

Por eso, para forzar re-seed de init scripts, usa:

```powershell
docker compose down -v --remove-orphans
docker compose up -d --build
```

### 4.2 Seed de datos de Auth (Prisma / GLOBAL_ADMIN)

Una vez arriba el stack, ejecuta migraciones y seed manualmente:

```powershell
# migraciones Prisma dentro del contenedor de auth
docker compose exec auth-service npx prisma migrate deploy --schema=./prisma/schema.prisma

# seed de auth (usa el seed compilado en dist)
docker compose exec auth-service node dist/src/prisma/seed.js
```

Si quieres ejecutar especificamente `seed.ts`, hazlo en local (fuera del contenedor):

```powershell
Set-Location services/auth
npm ci
npx prisma migrate deploy --schema=./prisma/schema.prisma
npx prisma db seed
Set-Location ../..
```

Nota: en el contenedor de produccion no se incluye `ts-node` (solo dependencias de produccion), por eso ahi se ejecuta `dist/src/prisma/seed.js`.

## 5) Comprobaciones rapidas

```powershell
# estado de contenedores
docker compose ps

# logs auth
docker compose logs --tail=120 auth-service

# health auth
docker compose exec auth-service wget --no-verbose --tries=1 --spider http://localhost:3001/health
```

## 6) Comando minimo para uso diario

Si ya hiciste build de webapp y no quieres limpiar volumenes:

```powershell
docker compose up -d --build
```
