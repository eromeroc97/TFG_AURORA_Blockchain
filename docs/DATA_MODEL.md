# Modelo de Datos y Persistencia

## 1. Modelo Relacional (PostgreSQL - Auth Service)

PostgreSQL 15-alpine fue seleccionado como motor de base de datos relacional para el servicio de autenticación debido a su robustez, soporte nativo para tipos UUID, y capacidad de manejo de transacciones complejas con atomicidad garantizada mediante Prisma ORM. Este modelo almacena las entidades de identidad del sistema: usuarios, ecosistemas, dispositivos y tokens de recuperación de contraseña.

### 1.1 Diagrama Entidad-Relación

```mermaid
erDiagram
    IDENTITY ||--o| USER : "1:1 optional"
    IDENTITY ||--o| ECOSYSTEM : "1:1"
    USER ||--o{ PASSWORD_RESET_TOKEN : "1:N"
    USER ||--o{ ECOSYSTEM : "1:N"
    ECOSYSTEM ||--o{ DEVICE : "1:N"

    IDENTITY {
        uuid id PK
        string type "USER | ECOSYSTEM"
        string publicKey
        string privateKeyCiphertext
        string privateKeyIv
        string privateKeyAuthTag
        datetime keyRotationTimestamp
        datetime createdAt
        datetime updatedAt
    }

    USER {
        uuid id PK
        uuid identityId FK "optional"
        string email UK
        string passwordHash
        datetime passwordChangedAt
        string hashedRefreshToken
        string role "USER | AUDITOR | ADMIN | GLOBAL_ADMIN"
        string status "PENDING | ACTIVE | PASSBLOCK | REVOKED"
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    PASSWORD_RESET_TOKEN {
        uuid id PK
        uuid userId FK
        string tokenHash
        string tokenFingerprint UK
        datetime createdAt
        datetime usedAt
    }

    ECOSYSTEM {
        uuid id PK
        uuid identityId FK UK
        string name
        uuid ownerId FK
        string apiKey "cifrada"
        string apiKeyIv
        string apiKeyAuthTag
        string status "PENDING | ACTIVE | REVOKED"
        float latitude
        float longitude
        boolean isOnline
        datetime lastSeen
        datetime createdAt
        datetime updatedAt
    }

    DEVICE {
        uuid id PK
        uuid ecosystemId FK
        string name
        string macAddress "varcar"
        string vendor
        datetime createdAt
        datetime updatedAt
    }
```

### 1.2 Diccionario de Datos

#### Tabla: Identity
Almacena las claves criptográficas de usuarios y ecosistemas. Cada entidad tiene un par de claves Ed25519 para firma digital.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | UUID | PK, Default uuid() | Identificador único |
| `type` | Enum IdentityType | Not Null | USER o ECOSYSTEM |
| `publicKey` | String | Not Null | Clave pública PEM |
| `privateKeyCiphertext` | String | Not Null | Clave privada cifrada (AES-256-GCM) |
| `privateKeyIv` | String | Not Null | Vector de inicialización |
| `privateKeyAuthTag` | String | Not Null | Tag de autenticación GCM |
| `keyRotationTimestamp` | DateTime | Nullable | Fecha de última rotación de claves |
| `createdAt` | DateTime | Default now() | Timestamp de creación |
| `updatedAt` | DateTime | Auto | Timestamp de última modificación |

#### Tabla: User
Gestiona las cuentas de usuario del sistema.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | UUID | PK, Default uuid() | Identificador único |
| `identityId` | UUID | FK, Unique, Nullable | Referencia a Identity |
| `email` | String | Unique, Not Null | Correo electrónico |
| `passwordHash` | String | Not Null | Hash Argon2 de contraseña |
| `passwordChangedAt` | DateTime | Default now() | Fecha de último cambio de contraseña |
| `hashedRefreshToken` | String | Nullable | Hash del token de renovación |
| `role` | Enum Role | Default USER | Rol del usuario |
| `status` | Enum UserStatus | Default PENDING | Estado de la cuenta |
| `isActive` | Boolean | Default true | Flag de activación |
| `createdAt` | DateTime | Default now() | Timestamp de creación |
| `updatedAt` | DateTime | Auto | Timestamp de última modificación |

**Índices**: `identityId` (para búsqueda por identidad).

#### Tabla: PasswordResetToken
Gestiona los tokens de recuperación de contraseña.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | UUID | PK, Default uuid() | Identificador único |
| `userId` | UUID | FK, Not Null | Usuario propietario |
| `tokenHash` | String | Not Null | Hash Argon2 del token |
| `tokenFingerprint` | String | Unique | SHA-256 del token para búsqueda |
| `createdAt` | DateTime | Default now() | Timestamp de creación |
| `usedAt` | DateTime | Nullable | Timestamp de uso (null si no usado) |

**Índices**: `userId`, `createdAt` (para limpieza de tokens antiguos).

#### Tabla: Ecosystem
Representa un ecosistema IoT agrupador de dispositivos.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | UUID | PK, Default uuid() | Identificador único |
| `identityId` | UUID | FK, Unique | Referencia a Identity del ecosistema |
| `name` | String | Not Null | Nombre del ecosistema |
| `ownerId` | UUID | FK | Usuario propietario |
| `apiKey` | String | Nullable, Cifrada | Clave API del ecosistema |
| `apiKeyIv` | String | Nullable | IV del cifrado de API key |
| `apiKeyAuthTag` | String | Nullable | Auth tag del cifrado |
| `status` | Enum EcosystemStatus | Default PENDING | Estado del ecosistema |
| `latitude` | Float | Nullable | Latitud geográfica |
| `longitude` | Float | Nullable | Longitud geográfica |
| `isOnline` | Boolean | Default false | Flag de disponibilidad |
| `lastSeen` | DateTime | Nullable | Última comunicación |
| `createdAt` | DateTime | Default now() | Timestamp de creación |
| `updatedAt` | DateTime | Auto | Timestamp de última modificación |

**Índices**: `ownerId` (para listar ecosistemas por usuario).

#### Tabla: Device
Representa un dispositivo IoT registrado dentro de un ecosistema.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | UUID | PK, Default uuid() | Identificador único |
| `ecosystemId` | UUID | FK, Not Null | Ecosistema padre |
| `name` | String | Not Null | Nombre descriptivo |
| `macAddress` | VarChar(255) | Nullable | Dirección MAC del dispositivo |
| `vendor` | String | Nullable | Fabricante resuelto |
| `createdAt` | DateTime | Default now() | Timestamp de creación |
| `updatedAt` | DateTime | Auto | Timestamp de última modificación |

**Índices**: `ecosystemId`, `ecosystemId + macAddress` (único).

### 1.3 Enumeraciones

```prisma
enum Role {
  USER      // Usuario estándar
  AUDITOR   // Usuario con permisos de auditoría
  ADMIN     // Administrador de ecosistema
  GLOBAL_ADMIN // Administrador global del sistema
}

enum UserStatus {
  PENDING   // Cuenta creada, pendiente de aprobación
  ACTIVE    // Cuenta activa y usable
  PASSBLOCK // Cuenta bloqueada por contraseña antigua
  REVOKED   // Cuenta revocada/eliminada lógicamente
}

enum IdentityType {
  USER      // Identidad criptográfica de usuario
  ECOSYSTEM // Identidad criptográfica de ecosistema
}

enum EcosystemStatus {
  PENDING  // Ecosistema creado, pendiente de activación
  ACTIVE   // Ecosistema operativo
  REVOKED  // EcosistemaRevocado lógicamente
}
```

## 2. Modelo Documental y Series Temporales (MongoDB - IoT Manager)

MongoDB 7.0 se utiliza como almacenamiento de telemetría de dispositivos IoT. La implementación utiliza la característica **Time Series Collection** nativa de MongoDB, optimizada para ingestede datos con marca de tiempo que se consultan como series temporales.

### 2.1 Implementación de Time Series

La colección `telemetry_events` se crea dinámicamente con la configuración de time series:

```typescript
await db.createCollection('telemetry_events', {
  timeseries: {
    timeField: 'timestamp',        // Campo que contiene la marca de tiempo
    metaField: 'metadata',         // Campo que contiene metadatos de división
    granularity: 'seconds',        // Granularidad de bucketing
  },
});
```

| Parámetro | Valor | Propósito |
|-----------|-------|------------|
| `timeField` | `timestamp` | Campo Date que representa el momento de la medición |
| `metaField` | `metadata` | Campo que contiene datos de navegación (ecosystemId, deviceId) |
| `granularity` | `seconds` | Bucketting de datos cada segundo para optimización |

### 2.2 Estructura del Documento de Telemetría

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "metadata": {
    "telemetryId": "65a1b2c3d4e5f678901234ab",
    "ecosystemId": "550e8400-e29b-41d4-a716-446655440000",
    "latitude": 40.416775,
    "longitude": -3.703790,
    "anchorStatus": "ANCHORED",
    "signature": "MEUCIQD...contenido_base64...",
    "publicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n",
    "txId": "mock-tx-1705312200123-a8f3k2"
  },
  "payload": {
    "devices": [
      {
        "mac_addr": "AA:BB:CC:DD:EE:FF",
        "temperature": 22.5,
        "humidity": 65
      }
    ]
  },
  "hash": "a1b2c3d4e5f678901234567890123456789012345678901234567890abcd"
}
```

**Descripción de campos:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `timestamp` | Date | Instante de la medición (timeField del time series) |
| `metadata` | Object | Metadatos de navegación (metaField) |
| `metadata.telemetryId` | String | ID único del registro de telemetría |
| `metadata.ecosystemId` | UUID | ID del ecosistema que generó los datos |
| `metadata.latitude` | Float | Latitud del dispositivo en el momento |
| `metadata.longitude` | Float | Longitud del dispositivo en el momento |
| `metadata.anchorStatus` | Enum | Estado del anclaje en blockchain |
| `metadata.signature` | String | Firma Ed25519 del hash (null si pendiente) |
| `metadata.publicKey` | String | Clave pública del firmante |
| `metadata.txId` | String | ID de transacción en blockchain |
| `payload` | Object | Datos originales del dispositivo |
| `hash` | String | SHA-256 del payload + coordenadas |

## 3. Estrategia de Indexación y Rendimiento

### 3.1 Índices en PostgreSQL

| Tabla | Índice | Propósito |
|-------|--------|------------|
| User | `identityId` | Búsqueda rápida por identidad linked |
| PasswordResetToken | `userId` | Listar tokens de un usuario |
| PasswordResetToken | `createdAt` | Limpieza de tokens expirados |
| Ecosystem | `ownerId` | Listar ecosistemas por propietario |
| Device | `ecosystemId` | Listar dispositivos de un ecosistema |
| Device | `ecosystemId, macAddress` (único) | Evitar duplicados |

### 3.2 Índices en MongoDB

```typescript
await collection.createIndex({ 'metadata.ecosystemId': 1, timestamp: -1 });
```

Este índice compuesto optimiza:
- Consultas por ecosistema ordenado por tiempo (dashboard, gráficos).
- Búsqueda de última interacción por dispositivo.

### 3.3 Políticas de Retención (TTL)

** Actualmente no hay TTL configurado**. Los datos de telemetría se retienen indefinidamente para auditoría y análisis histórico. En versiones futuras podría implementarse un TTL para cumplir con regulaciones de privacidad (RGPD).

## 4. Seguridad de los Datos (Data Privacy & Security)

### 4.1 Datos Cifrados en Reposo

| Tabla (PostgreSQL) | Campo | Algoritmo | Clave de Cifrado |
|--------------------|-------|------------|-------------------|
| Identity | `privateKeyCiphertext` | AES-256-GCM | CRYPTO_MASTER_KEY |
| Identity | `privateKeyIv` | - | - |
| Identity | `privateKeyAuthTag` | - | - |
| Ecosystem | `apiKey` | AES-256-GCM | API_KEY_ENCRYPTION_KEY |
| Ecosystem | `apiKeyIv` | - | - |
| Ecosystem | `apiKeyAuthTag` | - | - |
| User | `passwordHash` | Argon2id | - (one-way) |
| User | `hashedRefreshToken` | Argon2id | - (one-way) |
| PasswordResetToken | `tokenHash` | Argon2id | - (one-way) |

**Por qué cifrado en reposo:**
- Las claves privadas de ecosistemas y usuarios nunca se almacenan en texto claro.
- Even si un atacante obtiene acceso a la base de datos, no puede utilizar las claves privadas.
- El hash de contraseñas con Argon2 es unidireccional (no es posible recuperar la contraseña original).

### 4.2 Integridad de Datos de Telemetría

Cada registro de telemetría incluye un campo `hash` que es un SHA-256 del payload normalizado más las coordenadas GPS:

```typescript
const buildPayloadHash = (payload, latitude, longitude) => {
  const normalizedPayload = stableSortObject(payload);
  const dataToHash = JSON.stringify({
    payload: normalizedPayload,
    gps: { latitude, longitude },
  });
  return createHash('sha256').update(dataToHash).digest('hex');
};
```

**Propiedades del hash:**
- **Inmutabilidad**: Si alguien modifica el payload en la base de datos, el hash almacenado no coincidirá.
- **Detectabilidad**: El sistema puede detectar manipulación de datos históricos.
- **Trazabilidad**: El hash se firma digitalmente y se publica en blockchain (cuando anchorStatus = ANCHORED).

### 4.3 Prevención de Enumeración

El endpoint de recuperación de contraseña implementa protección contra enumeración de cuentas:
- Si el email no existe, se retorna el mismo tiempo de respuesta que si existiera.
- No se revela si una cuenta existe o no mediante mensajes de error diferenciados.

## 5. Infraestructura de Persistencia (Docker)

### 5.1 Servicios de Base de Datos en docker-compose.yml

```yaml
postgres-db:
  image: postgres:15-alpine
  environment:
    POSTGRES_USER: admin
    POSTGRES_PASSWORD: secret_password_tfg
    POSTGRES_DB: identity_vault
  ports:
    - "127.0.0.1:5432:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./infra/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
  networks:
    - aurora-secure-net

mongo-db:
  image: mongo:7.0
  environment:
    MONGO_INITDB_ROOT_USERNAME: admin
    MONGO_INITDB_ROOT_PASSWORD: secret_password_tfg
  volumes:
    - mongo_data:/data/db
    - ./infra/mongo/init.js:/docker-entrypoint-initdb.d/init.js:ro
  networks:
    - aurora-secure-net

## Redis (Instancias Aisladas)

El sistema implementa dos instancias Redis separadas para cumplir con el patrón Zero Trust:

- **redis-auth** (puerto 6379): Usado por auth-service para token blacklist y sesiones.
- **redis-iot** (puerto 6380): Usado por iot-manager para cache de API keys.

```yaml
redis-auth:
  image: redis:7-alpine
  container_name: redis-auth
  command: ["redis-server"]
  ports:
    - "6379:6379"
  volumes:
    - redis_auth_data:/data
  networks:
    - aurora-secure-net

redis-iot:
  image: redis:7-alpine
  container_name: redis-iot
  command: ["redis-server"]
  ports:
    - "6380:6379"
  volumes:
    - redis_iot_data:/data
  networks:
    - aurora-secure-net
```

### 5.2 Volúmenes Persistentes

| Volumen | Tipo | Propósito |
|---------|------|------------|
| `postgres_data` | Named Volume | Datos de PostgreSQL (identidades, usuarios, ecosistemas) |
| `mongo_data` | Named Volume | Datos de MongoDB (telemetría) |
| `redis_auth_data` | Named Volume | Datos de Redis (auth-service: token blacklist, sesiones) |
| `redis_iot_data` | Named Volume | Datos de Redis (iot-manager: cache de API keys) |
| `seq_data` | Named Volume | Logs centralizados |

### 5.3 Configuración de Red

- **PostgreSQL**: Expuesto solo en `127.0.0.1:5432` (localhost). Accesible internamente por Auth Service via hostname `postgres-db`.
- **MongoDB**: Expuesto internamente en la red `aurora-secure-net`. Accesible por IoT Manager via hostname `mongo-db`.
- **Redis Auth**: Expuesto en puerto 6379 internamente. Usado por auth-service para token blacklist y sesiones.
- **Redis IoT**: Expuesto en puerto 6380 internamente. Usado por iot-manager para cache de API keys.

### 5.4 Resumen de Versiones y Puertos

| Servicio | Imagen | Puerto Externo | Red |
|----------|--------|----------------|-----|
| PostgreSQL | postgres:15-alpine | 127.0.0.1:5432 | aurora-secure-net |
| MongoDB | mongo:7.0 | (interno) | aurora-secure-net |
| Redis Auth | redis:7-alpine | 6379 | aurora-secure-net |
| Redis IoT | redis:7-alpine | 6380 | aurora-secure-net |
| Seq | datalust/seq:latest | 5341, 8081 | aurora-secure-net |

### 5.5 Flujo de Persistencia de Telemetría

```mermaid
flowchart TB
    subgraph Dispositivo
        DEV[Dispositivo IoT]
    end

    subgraph "IoT Manager (Fastify)"
        API[Endpoint /v1/ingest]
        HASH[buildPayloadHash<br/>SHA-256]
        SAVE[save() MongoDB]
        UPDATE[updateAnchorStatus()]
    end

    subgraph "Auth Service (NestJS)"
        SIGN[signHash<br/>Ed25519]
        VALIDATE[validateApiKey]
    end

    subgraph "PostgreSQL"
        ECOSYSTEM[(Ecosystem<br/>apiKey cifrada)]
    end

    subgraph "MongoDB"
        TELEMETRY[(telemetry_events<br/>Time Series)]
    end

    subgraph "Blockchain (FireFly)"
        BROADCAST[Broadcast Anchor]
    end

    DEV -->|POST /api/telemetry/v1/ingest| API
    API --> HASH
    HASH --> SAVE
    SAVE --> TELEMETRY
    
    API --> VALIDATE
    VALIDATE --> ECOSYSTEM
    
    API --> SIGN
    SIGN --> ECOSYSTEM
    
    SIGN --> BROADCAST
    BROADCAST --> UPDATE
    UPDATE --> TELEMETRY
    
    style DEV fill:#ffcccc,stroke:#333
    style TELEMETRY fill:#e8f4f8,stroke:#333
    style ECOSYSTEM fill:#e8f4f8,stroke:#333
```

El flujo de datos de telemetría funciona así:

1. **Ingesta**: El dispositivo envía datos al endpoint `/v1/ingest` del IoT Manager con su API Key.
2. **Validación**: El IoT Manager valida la API Key contra el Auth Service, que descifra la clave almacenada en PostgreSQL.
3. **Cálculo de Hash**: Se genera un SHA-256 del payload normalizado + coordenadas GPS.
4. **Persistencia Inicial**: Se almacena en MongoDB con estado `PENDING_ANCHOR`.
5. **Firma**: El IoT Manager solicita la firma del hash al Auth Service, que descifra la clave privada del ecosistema.
6. **Broadcast**: La firma se envía a FireFly (mockeado actualmente).
7. **Actualización**: Se actualiza el documento en MongoDB con el estado `ANCHORED`, la firma, la clave pública y el txId.

Este modelo híbrido (relacional + documental) permite:
- **PostgreSQL**: Gestión de identidades, control de acceso y persistencia de entidades con relaciones complejas.
- **MongoDB Time Series**: Ingesta eficiente de grandes volúmenes de datos de telemetría con optimización de almacenamiento y consulta temporal.