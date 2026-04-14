# Microservicio Auth - Documentacion Tecnica Completa

## 1. Resumen

El microservicio Auth gestiona identidad y acceso del dominio IAM de AURORA para:

- Alta de usuarios Web2.
- Estado de ciclo de vida de usuarios.
- Provisionado inicial de administrador global.
- Integracion con FireFly para identificadores descentralizados (DID) en escenarios concretos.
- Gestion de ecosistemas y su estado operativo.

Actualmente, la via oficial de alta de usuarios externos es:

- POST /api/auth/users (via Traefik)

## 2. Alcance del servicio

### 2.1 Responsabilidades

- Exponer API HTTP de usuarios y ecosistemas.
- Persistir usuarios/ecosistemas/dispositivos en PostgreSQL con Prisma.
- Hashear contrasenas con argon2.
- Crear o recuperar DID de organizacion para casos de negocio especificos.
- Crear automaticamente el usuario GLOBAL_ADMIN en el seed.

### 2.2 No responsabilidades

- No emite JWT en el estado actual.
- No valida KYC/flujo de aprobacion administrativa completo.
- No asigna DID blockchain a usuarios nuevos en el alta Web2.
- No ejecuta reglas RBAC en runtime (hay TODOs para guardas).

## 3. Arquitectura logica

```mermaid
flowchart LR
    Client[Cliente HTTP] --> Traefik[API Gateway Traefik]
    Traefik -->|/api/auth/* -> strip /api/auth| Auth[NestJS Auth Service :3001]

    Auth --> Users[Users Module]
    Auth --> Ecos[Ecosystems Module]
    Auth --> Health[Health Controller]

    Users --> Prisma[Prisma Service]
    Ecos --> Prisma
    Prisma --> Postgres[(PostgreSQL identity_vault)]

    Users -. opcional futuro .-> FireFly[(FireFly API)]
    Ecos --> FireFly
    Seed[Prisma Seed] --> FireFly
    Seed --> Postgres
```

## 4. Arquitectura de modulos NestJS

```mermaid
flowchart TD
    AppModule --> UsersModule
    AppModule --> EcosystemsModule
    AppModule --> HealthController

    UsersModule --> PrismaModule
    UsersModule --> BlockchainModule

    EcosystemsModule --> PrismaModule
    EcosystemsModule --> BlockchainModule

    PrismaModule --> PrismaService
    BlockchainModule --> FireflyService
```

Notas:

- El submodulo iam/auth fue eliminado y ya no forma parte del runtime.
- El endpoint /auth/register no esta expuesto.

## 5. Topologia de despliegue (Docker Compose)

Servicios principales:

- auth-service
- iot-manager
- api-gateway (Traefik)
- postgres-db
- mongo-db
- docker-socket-proxy

Red:

- aurora-secure-net

Volumenes:

- postgres_data
- mongo_data

## 6. Enrutado Traefik para Auth

Regla relevante en compose:

- Router: PathPrefix(/api/auth)
- Middleware stripPrefix: /api/auth
- Puerto interno auth-service: 3001

Efecto:

- Externo: /api/auth/users
- Interno en Nest: /users

## 7. Contrato API (estado actual)

### 7.1 Health

- GET /health
- Respuesta:

```json
{
  "status": "UP",
  "service": "auth"
}
```

### 7.2 Users

Base interna: /users

Rutas:

- POST /users
- GET /users
- GET /users/:id
- PATCH /users/:id
- DELETE /users/:id

Via Traefik (publico):

- POST /api/auth/users
- GET /api/auth/users
- GET /api/auth/users/:id
- PATCH /api/auth/users/:id
- DELETE /api/auth/users/:id

#### 7.2.1 POST /users - Request DTO

Campos principales:

- email (obligatorio, email valido)
- password (obligatorio, strong password)
- role (opcional: GLOBAL_ADMIN | AUDITOR | OWNER)
- did (opcional en DTO, pero el servicio fuerza null en alta Web2)
- isActive (opcional)

Ejemplo:

```json
{
  "email": "investigador_test@uclm.es",
  "password": "PasswordSegura123!"
}
```

Comportamiento de negocio actual:

- Verifica unicidad de email.
- Hashea password con argon2.
- Crea usuario con:
  - status = PENDING
  - did = null
- Devuelve entidad sin passwordHash.

### 7.3 Ecosystems

Base interna: /ecosystems

Rutas:

- POST /ecosystems
- GET /ecosystems
- GET /ecosystems/:id
- PATCH /ecosystems/:id
- PATCH /ecosystems/:id/heartbeat
- DELETE /ecosystems/:id

Observacion:

- En create, ownerId puede venir en body o fallback por variable TEST_OWNER_ID o UUID fijo temporal.

## 8. Modelo de datos (Prisma)

### 8.1 Enums

- Role: GLOBAL_ADMIN, AUDITOR, OWNER
- UserStatus: PENDING, ACTIVE, REVOKED
- EcosystemStatus: PENDING, ACTIVE, REVOKED

### 8.2 Entidades

- User
- Ecosystem
- Device

```mermaid
erDiagram
    User ||--o{ Ecosystem : owns
    Ecosystem ||--o{ Device : contains

    User {
      uuid id
      string email
      string passwordHash
      string role
      string status
      boolean isActive
      string did
      datetime createdAt
      datetime updatedAt
    }

    Ecosystem {
      uuid id
      string name
      uuid ownerId
      string did
      string certificateFingerprint
      string status
      float latitude
      float longitude
      boolean isOnline
      datetime lastSeen
      datetime createdAt
      datetime updatedAt
    }

    Device {
      uuid id
      uuid ecosystemId
      string name
      string localType
      datetime createdAt
      datetime updatedAt
    }
```

## 9. Modelo de identidad y cadena de confianza

### 9.1 Principios aplicados

- El DID de organizacion no se asigna a usuarios finales.
- El GLOBAL_ADMIN se crea con identidad propia blockchain.
- Usuarios nuevos Web2 se crean con DID nulo y estado PENDING.

### 9.2 Flujo de seed para GLOBAL_ADMIN

```mermaid
sequenceDiagram
    participant Seed as Prisma Seed
    participant FF as FireFly
    participant DB as PostgreSQL

    Seed->>FF: GET /status
    FF-->>Seed: org.id + org.verifiers

    alt falta verificador org
      Seed->>FF: GET /verifiers
      FF-->>Seed: lista verifiers
    end

    Seed->>FF: POST /identities {name: admin_global, type: custom, parent: orgId, key}
    FF-->>Seed: did custom (o error)

    alt exito
      Seed->>DB: upsert admin@uclm.es with did real, role GLOBAL_ADMIN, status ACTIVE
    else error FF
      Seed->>DB: upsert admin@uclm.es with fallback did:firefly:offline-generated-admin
    end
```

## 10. Variables de entorno

Archivo local del servicio:

- DATABASE_URL=postgresql://admin:secret_password_tfg@localhost:5432/identity_vault?schema=public
- FIREFLY_API_URL=http://localhost:5000/api/v1/namespaces/default

Requisitos:

- DATABASE_URL debe apuntar a la base existente.
- FIREFLY_API_URL debe apuntar al namespace correcto de FireFly.

## 11. Build, runtime y Docker

### 11.1 Dockerfile Auth

- Multi-stage build.
- Node 22 en build y produccion.
- Generacion de Prisma Client en imagen de produccion.
- CMD final: node dist/src/main

### 11.2 Puertos

- Auth escucha en 3001 dentro de contenedor.
- Exposicion publica via Traefik en puerto 80 (ruta /api/auth/*).

## 12. Migraciones y bootstrap

Migraciones Prisma relevantes:

- 20260413065806_init_iam_schema
- 20260414082254_add_ecosystem_tracking_and_location
- 20260414083044_add_ecosystem_did
- 20260414130000_add_user_status

Orden recomendado en entorno limpio:

1. docker compose down -v --remove-orphans
2. docker compose up -d --build
3. npx prisma migrate deploy
4. npx prisma db seed

## 13. Runbook operativo

### 13.1 Levantar stack

- docker compose up -d --build

### 13.2 Ver logs auth

- docker compose logs --tail=120 auth-service

### 13.3 Probar alta usuario via gateway

PowerShell:

```powershell
Invoke-RestMethod -Uri "http://localhost/api/auth/users" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"email":"investigador_test@uclm.es","password":"PasswordSegura123!"}'
```

### 13.4 Verificar admin seed en DB

```sql
SELECT "email", "did", "status"
FROM "User"
WHERE "email" = 'admin@uclm.es';
```

## 14. Seguridad actual y huecos

### 14.1 Implementado

- Hash de password con argon2.
- Validaciones de DTO con class-validator.
- Unicidad de email y DID en esquema.

### 14.2 Pendiente

- JWT/AuthGuard y RolesGuard para rutas IAM.
- Separacion estricta de permisos por rol.
- Auditoria de eventos de seguridad.
- Politica de rotacion/gestion de credenciales y secretos.

## 15. Riesgos y consideraciones

1. Si FireFly falla en seed, admin puede quedar con DID fallback.
2. DTO de CreateUserDto expone campo did, pero servicio lo fuerza a null en altas Web2.
3. Endpoints findAll/findOne/update/remove de Users aun son placeholders y deben completarse.
4. En ecosistemas se usa ownerId temporal por body/env hasta integrar auth de sesion real.

## 16. Troubleshooting (incidencias reales de esta sesion)

1. Error de arranque Docker: Cannot find module /app/dist/main
- Causa: salida real en dist/src/main.js
- Solucion: CMD node dist/src/main

2. Error Prisma runtime: Cannot find module .prisma/client/default
- Causa: Prisma Client no generado en stage de produccion
- Solucion: copiar prisma + prisma.config.ts y ejecutar prisma generate en imagen

3. Error seed P1003 Database does not exist
- Causa: POSTGRES_DB vacio en compose
- Solucion: POSTGRES_DB=identity_vault

4. Error seed P2021 Table public.User does not exist
- Causa: seed sin migraciones aplicadas
- Solucion: prisma migrate deploy antes de prisma db seed

## 17. Decision log relevante

1. Eliminado flujo /auth/register para evitar doble via de alta.
2. Entrada oficial de alta: /api/auth/users.
3. Usuarios nuevos sin DID inicial, pendientes de validacion.
4. GLOBAL_ADMIN con identidad propia blockchain en seed.

## 18. Siguientes pasos recomendados

1. Completar CRUD real de Users (ahora parcialmente mock).
2. Integrar JWT + RBAC en controllers IAM.
3. Crear endpoint administrativo para aprobacion de usuario y asignacion posterior de DID.
4. Alinear DTOs para ocultar did en alta publica (o documentar claramente que se ignora).
5. Anadir pruebas E2E del flujo completo:
   - migrate + seed
   - alta /api/auth/users
   - aprobacion admin
   - asignacion DID
