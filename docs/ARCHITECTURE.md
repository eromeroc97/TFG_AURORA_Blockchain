# Arquitectura del Proyecto

## 1. Visión General

El proyecto **AURORA Smart Home** es una plataforma de investigación en ciberseguridad diseñada para la gestión, monitoreo y auditoría de dispositivos IoT en ecosistemas distribuidos. El sistema implementa un paradigma de arquitectura de microservicios orientado a la evaluación de vulnerabilidades en entornos controlados y al diseño de contramedidas criptográficas para la protección de datos de telemetría.

El despliegue se realiza mediante **Docker Compose**, donde cada servicio opera en un contenedor aislado dentro de una red bridge dedicada denominada `aurora-secure-net`. La arquitectura sigue el patrón de **API Gateway** utilizando Traefik como reverse proxy y balanceador de carga, lo que permite el enrutamiento inteligente basado en rutas path-prefix y la exposición segura de servicios hacia el exterior.

El sistema se compone de tres pilares fundamentales:

- **Servicio de Autenticación (auth-service)**: Backend NestJS responsable de la gestión de identidades, control de acceso basado en roles (RBAC), generación de tokens JWT con algoritmos asimétricos (RS256), y operaciones criptográficas mediante el módulo CryptoService.
- **Servicio IoT Manager (iot-manager)**: Backend Fastify especializado en la ingestión de telemetría de dispositivos, validación de claves API, almacenamiento en MongoDB, y orquestación del descubrimiento de dispositivos.
- **Aplicación Web (webapp)**: Frontend React con Vite que proporciona la interfaz de usuario para la gestión de ecosistemas, dispositivos y visualización de datos georreferenciados.

La arquitectura incorpora patrones de seguridad avanzados como el cifrado de claves privadas con AES-256-GCM, firmas digitales Ed25519 para la integridad de datos, y una capa de logging centralizada mediante Seq para auditoría forense.

## 2. Diagrama de Contexto y Entorno

```mermaid

graph TB
    subgraph "Red Externa"
        USUARIO[Usuario/Investigador]
        DISPOSITIVO_IoT[Dispositivo IoT]
        MAC_VENDOR_API[API MacVendors]
    end

    subgraph "aurora-secure-net"
        subgraph "API Gateway"
            TRAEFIK[Traefik<br/>puertos: 80, 443, 8080]
        end

        subgraph "Servicios de Aplicación"
            WEBAPP[Caddy + React<br/>:80]
            AUTH[NestJS Auth<br/>:3001]
            IOT[Fastify IoT<br/>:3002]
        end

        subgraph "Infraestructura de Datos"
            POSTGRES[(PostgreSQL<br/>:5432)]
            MONGO[(MongoDB<br/>:27017)]
            REDIS_AUTH[(Redis Auth<br/>:6379)]
            REDIS_IOT[(Redis IoT<br/>:6380)]
            SEQ[(Seq Logging<br/>:5341)]
        end

        subgraph "Servicios Auxiliares"
            MAILPIT[Mailpit<br/>SMTP:1025 Web:8025]
            MONGO_EXP[Mongo Express<br/>:8090]
            REDIS_CMD[Redis Commander<br/>:8091]
            DOCKER_PROXY[Docker Socket<br/>Proxy]
        end
    end

    subgraph "Blockchain (Externo)"
        FIREFLY[FireFly API<br/>Hyperledger]
    end

    USUARIO -->|HTTPS| TRAEFIK
    DISPOSITIVO_IoT -->|x-api-key| TRAEFIK
    TRAEFIK -->|Path: /api/auth/**| AUTH
    TRAEFIK -->|Path: /api/telemetry/**| IOT
    TRAEFIK -->|Path: /| WEBAPP

    AUTH -->|Prisma ORM| POSTGRES
    AUTH -->|Redis Client| REDIS_AUTH
    AUTH -->|HTTP| FIREFLY
    AUTH -->|SMTP| MAILPIT

    IOT -->|Mongo Driver| MONGO
    IOT -->|Redis Client| REDIS_IOT
    IOT -->|HTTP POST| AUTH
    IOT -->|API Externa| MAC_VENDOR_API

    AUTH -->|Winston| SEQ
    IOT -->|Fastify Logger| SEQ
    TRAEFIK -->|Docker Provider| DOCKER_PROXY
```

### Entidades y Decisiones del docker-compose.yml

El archivo `docker-compose.yml` define la siguiente topología de servicios:

| Servicio | Imagen | Puertos Expuestos | Propósito |
|----------|--------|-------------------|-----------|
| **api-gateway** | traefik:latest | 80, 443, 8080 | Reverse proxy, balanceador y enrutador |
| **auth-service** | Build local (NestJS) | 3001 (interno) | Autenticación, gestión de usuarios y ecosistemas |
| **iot-manager** | Build local (Fastify) | 3002 (interno) | Ingestión de telemetría IoT |
| **webapp** | caddy:2.8.4-alpine | 80 (interno) | Interfaz web estática |
| **postgres-db** | postgres:15-alpine | 5432 (localhost) | Base de datos relacional para identidades |
| **mongo-db** | mongo:7.0 | 27017 (interno) | Almacenamiento de telemetría |
| **redis-auth** | redis:7-alpine | 6379 | Cache de sesiones y token blacklist (auth-service) |
| **redis-iot** | redis:7-alpine | 6380 | Cache de claves API (iot-manager) |
| **seq** | datalust/seq:latest | 5341, 8081 | Centralización de logs |
| **mailpit** | axllent/mailpit | 1025, 8025 | Servidor SMTP mock para desarrollo |
| **mongo-express** | mongo-express | 8090 (localhost) | Administración MongoDB |
| **redis-commander** | rediscommander | 8091 (localhost) | Administración Redis |
| **docker-socket-proxy** | tecnativa/docker-socket-proxy | - | Proxy seguro del socket Docker |

**Decisiones de Seguridad en la Red:**
- Los puertos de administración (Mongo Express, Redis Commander) solo exponen a `127.0.0.1`, previniendo acceso desde la red externa.
- Todos los servicios de aplicación residen en la red `aurora-secure-net` con driver bridge.
- Traefik utiliza etiquetas para el descubrimiento dinámico de servicios.

## 3. Módulos y Componentes Internos

```mermaid

graph TB
    subgraph "Auth Service (NestJS)"
        MAIN[main.ts<br/>Bootstrap App]
        APP[app.module.ts<br/>Root Module]
        
        subgraph "IAM Module"
            AUTH[auth/<br/>AuthService, AuthController]
            USERS[users/<br/>UsersService, UsersController]
            ECOSYSTEMS[ecosystems/<br/>EcosystemsService]
            DEVICES[devices/<br/>DevicesService]
            REDIS[redis/<br/>RedisService]
        end

        subgraph "Shared Services"
            CRYPTO[crypto/<br/>CryptoService]
            BLOCKCHAIN[blockchain/<br/>FireflyService]
            MAIL[mail/<br/>MailService]
            LOGGING[logging/<br/>AuthLogger]
            ERROR[errors/<br/>GlobalExceptionFilter]
        end

        subgraph "Infrastructure"
            PRISMA[prisma/<br/>PrismaService]
            HEALTH[health.controller.ts]
        end
    end

    subgraph "IoT Manager (Fastify)"
        INDEX[index.ts<br/>BuildApp]
        
        subgraph "Core Services"
            TELEMETRY[telemetry-store.ts<br/>MongoTelemetryStore]
            DISCOVERY[device-discovery.ts<br/>DeviceDiscoveryService]
            CACHE[api-key-cache.ts<br/>ApiKeyCache]
            CONFIG[config.ts<br/>loadConfig]
        end
    end

    subgraph "Webapp (React + Vite)"
        APP_TSX[App.tsx<br/>Router Root]
        AUTH_PROVIDER[context/AuthProvider]
        PAGES[pages/<br/>Login, Dashboard, Account]
        API[api/axios.ts]
        COMPONENTS[components/]
    end

    MAIN --> APP
    APP --> AUTH & USERS & ECOSYSTEMS & DEVICES & REDIS & CRYPTO & BLOCKCHAIN & MAIL & LOGGING & ERROR & PRISMA & HEALTH
    INDEX --> TELEMETRY & DISCOVERY & CACHE & CONFIG
    
    AUTH --> CRYPTO
    ECOSYSTEMS --> CRYPTO
    ECOSYSTEMS --> BLOCKCHAIN
    CRYPTO --> PRISMA
    
    IOT --> AUTH
    TELEMETRY --> MONGO[(MongoDB)]
    CACHE --> REDIS[(Redis)]
```

### Responsabilidad de Cada Módulo

#### Auth Service (NestJS - Puerto 3001)

| Módulo | Responsabilidad |
|--------|----------------|
| **AuthModule** | Gestión de autenticación JWT, login, logout, refresh tokens, recuperación de contraseña mediante tokens de un solo uso (OTP). Implementa estrategia de protección con Passport-JWT yguardias de roles. |
| **UsersModule** | CRUD de usuarios, gestión de estados (ACTIVE, PENDING, REVOKED, PASSBLOCK), hashing de contraseñas con Argon2, almacenamiento de refresh tokens. |
| **EcosystemsModule** | Creación de ecosistemas IoT, generación de claves API cifradas con AES-256-GCM, gestión del ciclo de vida de ecosistemas, firma de hashes mediante Ed25519. |
| **DevicesModule** | Registro y actualización de dispositivos vinculados a ecosistemas, búsqueda por MAC address, control de vendors. |
| **RedisModule** | Blacklisting de tokens revocados, cacheo de sesiones activas, gestión de rate limiting. |
| **CryptoModule** | Servicios criptográficos centrales: generación de pares de claves Ed25519, cifrado/descifrado con AES-256-GCM, firma digital, verificación de firmas, hash SHA-256. |
| **BlockchainModule** | Integración con Hyperledger FireFly para creación de identidades on-chain y broadcast de anchors (actualmente en modo mock). |
| **MailModule** | Envío de correos electrónicos transaccionales (registro, recuperación de contraseña) utilizando Nodemailer con plantillas Handlebars. |
| **PrismaService** | Capa de acceso a datos PostgreSQL mediante ORM Prisma, gestión de transacciones y migraciones. |

#### IoT Manager (Fastify - Puerto 3002)

| Módulo | Responsabilidad |
|--------|----------------|
| **index.ts (buildApp)** | Aplicación principal Fastify, definición de rutas POST /v1/ingest, GET /devices/last-interaction, middlewares de autenticación API key, pipeline de procesamiento de telemetría. |
| **telemetry-store.ts** | Almacenamiento de datos de telemetría en MongoDB, cálculo de hash SHA-256 del payload, gestión de estados de anchor (PENDING, ANCHORED, FAILED). |
| **device-discovery.ts** | Descubrimiento y sincronización de dispositivos con el servicio de autenticación, resolución de vendors mediante API externa macvendors.com, registro/update de dispositivos. |
| **api-key-cache.ts** | Cacheo en Redis de claves API válidas con TTL configurable (default 10 min), invalidated cache para claves revocadas (TTL 15 seg). |
| **config.ts** | Carga de variables de entorno, validación de configuración requerida. |

#### Webapp (React - Puerto 80 via Caddy)

| Componente | Responsabilidad |
|------------|-----------------|
| **App.tsx** | Routing principal con React Router v7, definición de rutas protegidas y públicas. |
| **AuthProvider** | Context provider para gestión de estado de autenticación, almacenamiento de JWT en memoria, protección de rutas. |
| **pages/** | Componentes de vista: Login, Register, Recover, Reset, Dashboard (visualización de ecosistemas y dispositivos), Account. |
| **api/axios.ts** | Cliente HTTP configurado con interceptores para inyección de tokens JWT y manejo de errores. |
| **MainLayout** | Layout común con navegación, header, sidebar. |

## 4. Flujo de Ejecución y Secuencias

### Diagrama de Secuencia: Ingestión de Telemetría

```mermaid

sequenceDiagram
    participant DISP as Dispositivo IoT
    participant TRAEFIK as Traefik
    participant IOT as IoT Manager
    participant REDIS as Redis Cache
    participant AUTH as Auth Service
    participant MONGO as MongoDB
    participant FIREFLY as FireFly (Mock)

    DISP->>TRAEFIK: POST /api/telemetry/v1/ingest<br/>x-api-key: AUR-xxx
    TRAEFIK->>IOT: Route to iot-manager
    
    rect rgb(230, 245, 230)
        Note over IOT: Validación API Key
        IOT->>REDIS: GET cache:hash(apiKey)
        alt Cache Hit
            REDIS-->>IOT: {ecosystemId, valid}
        else Cache Miss
            IOT->>AUTH: POST /api/ecosystems/validate-api-key<br/>lat, lng, x-api-key
            AUTH->>AUTH: decryptApiKey & compare
            AUTH-->>IOT: {valid: true, ecosystemId}
            IOT->>REDIS: SET cache:hash(apiKey)<br/>TTL=600s
        end
    end
    
    alt API Key Inválida
        IOT-->>DISP: 401 Unauthorized
    end
    
    rect rgb(230, 240, 245)
        Note over IOT: Procesamiento Telemetría
        IOT->>MONGO: saveTelemetry<br/>status=PENDING
        MONGO-->>IOT: {id, hash}
        
        IOT->>IOT: buildPayloadHash<br/>SHA-256(payload + gps)
        
        IOT->>AUTH: POST /api/ecosystems/sign<br/>ecosystemId, hash
        AUTH->>AUTH: decryptPrivateKey
        AUTH->>AUTH: sign(hash, Ed25519)
        AUTH-->>IOT: {signature, publicKey}
        
        IOT->>FIREFLY: POST /messages/broadcast<br/>(Mock: 500ms delay)
        FIREFLY-->>IOT: {txId: mock-tx-xxx}
        
        IOT->>MONGO: updateAnchorStatus<br/>ANCHORED, signature, txId
        IOT-->>DISP: 202 Accepted<br/>{ingestId, txId, hash}
    end
    
    rect rgb(255, 240, 240)
        Note over IOT: Device Discovery (Async)
        IOT->>IOT: resolveVendor(mac)<br/>via macvendors.com API
        IOT->>AUTH: POST /api/devices/register<br/>mac, vendor, ecosystemId
        AUTH->>POSTGRES: create/update device
    end
```

### Diagrama de Flujo de Datos (Data Flow)

```mermaid

flowchart TB
    subgraph "Input Layer"
        DEVICES[Dispositivos IoT]
        USER[Usuario Web]
    end

    subgraph "API Gateway Layer"
        TRAEFIK[Traefik<br/>Routing & SSL]
    end

    subgraph "Auth Service Layer"
        JWT[JWT Generation<br/>RS256]
        CRYPTO[Crypto Ops<br/>Ed25519, AES-256-GCM]
        DB_AUTH[(PostgreSQL<br/>Users, Ecosystems)]
        REDIS_AUTH[(Redis Auth<br/>Token Blacklist)]
    end

    subgraph "IoT Manager Layer"
        API_KEY[API Key Validation]
        CACHE[(Redis IoT<br/>API Key Cache)]
        TELEMETRY[Telemetry Processing]
        DISCOVERY[Device Discovery]
        DB_IOT[(MongoDB<br/>Telemetry)]
    end

    subgraph "Output Layer"
        FIREFLY["FireFly Broadcast (Mock)"]
        SEQ["Seq Logging"]
        UI["Webapp UI (React Dashboard)"]
    end

    DEVICES -->|x-api-key| TRAEFIK
    USER -->|HTTPS| TRAEFIK
    
    TRAEFIK -->|Path /api/auth| JWT
    TRAEFIK -->|Path /api/telemetry| API_KEY
    
    JWT --> CRYPTO
    JWT --> DB_AUTH
    JWT --> REDIS_AUTH
    
    API_KEY --> CACHE
    API_KEY --> JWT
    API_KEY --> TELEMETRY
    
    TELEMETRY --> CRYPTO
    TELEMETRY --> DB_IOT
    TELEMETRY --> FIREFLY
    TELEMETRY --> DISCOVERY
    
    DISCOVERY --> JWT
    JWT --> DB_AUTH
    
    TELEMETRY -->|Winston| SEQ
    
    DB_AUTH --> UI
    DB_IOT --> UI
```

### Descripción del Ciclo de Vida Principal

El flujo de ejecución principal del sistema sigue un patrón de procesamiento de telemetría en 8 pasos:

1. **Recepción de Solicitud**: El dispositivo IoT envía una petición POST a `/api/telemetry/v1/ingest` incluyendo la cabecera `x-api-key` con la clave del ecosistema y un body conteniendo latitud, longitud, array de dispositivos y timestamp opcional.

2. **Validación de API Key (Cache)**: El IoT Manager consulta Redis con el hash SHA-256 de la clave API. Si existe en cache y no ha expirado, se extrae el ecosystemId directamente.

3. **Fallback al Auth Service**: En caso de cache miss, el IoT Manager invoca al endpoint interno de validación del auth-service, que descifra la clave API almacenada en PostgreSQL y verifica su estado activo.

4. **Almacenamiento Inicial**: Los datos de telemetría se persisten en MongoDB con estado inicial `PENDING_ANCHOR`, incluyendo el hash SHA-256 calculado a partir del payload normalizado y las coordenadas GPS.

5. **Solicitud de Firma**: El IoT Manager invoca al endpoint `/api/ecosystems/sign` del auth-service proporcionando el ecosystemId y el hash. El servicio de autenticación recupera la clave privada del ecosistema (descifrada con AES-256-GCM usando la master key) y genera una firma Ed25519.

6. **Broadcast a Blockchain**: La firma, el hash original y la clave pública se envían a FireFly (actualmente mockeado con un retraso de 500ms) para su anclaje en la blockchain. Se obtiene un txId como justificante.

7. **Actualización de Estado**: Una vez confirmado el broadcast, se actualiza el registro en MongoDB con estado `ANCHORED`, incluyendo la firma, clave pública y txId.

8. **Sincronización de Dispositivos (Asíncrono)**: En background, el DeviceDiscoveryService procesa los dispositivos recibidos, consulta la API externa macvendors.com para resolver el vendor por MAC, y registra/actualiza cada dispositivo en PostgreSQL a través del auth-service.

## 5. Pila Tecnológica e Infraestructura

### Lenguajes y Frameworks

| Componente | Tecnología | Versión |
|------------|------------|---------|
| **Auth Service** | Node.js + NestJS | Node 22-alpine |
| **IoT Manager** | Node.js + Fastify | Node 20-alpine |
| **Webapp** | React + Vite | React 19, Vite 8 |
| **Base de Datos Relacional** | PostgreSQL | 15-alpine |
| **Base de Datos Documental** | MongoDB | 7.0 |
| **Cache y Sesiones** | Redis | 7-alpine |
| **Logging Centralizado** | Seq (Datalust) | latest |
| **Reverse Proxy** | Traefik | latest |
| **Servidor Web Estático** | Caddy | 2.8.4-alpine |

### Librerías de Seguridad y Redes Críticas

#### Auth Service (package.json)
- `@nestjs/jwt`: Generación y verificación de tokens JWT con algoritmos RS256.
- `@nestjs/passport` + `passport-jwt`: Implementación de estrategia de autenticación basada en tokens.
- `argon2`: Hashing de contraseñas resistant a ataques de fuerza bruta y GPU.
- `nodemailer`: Envío de correos transaccionales con soporte SMTP.
- `@prisma/client`: ORM con soporte para PostgreSQL.
- `winston` + `winston-seq`: Logging estructurado con exportación a Seq.

#### IoT Manager (package.json)
- `fastify`: Servidor HTTP de alto rendimiento con validación de esquemas.
- `ioredis`: Cliente Redis con soporte para cluster y reconnections.
- `mongodb`: Driver nativo para MongoDB con pooling de conexiones.

#### Webapp (package.json)
- `react-router-dom`: Enrutamiento cliente-side con protección de rutas.
- `axios`: Cliente HTTP con interceptores para autenticación.
- `react-leaflet` + `leaflet`: Mapas interactivos para visualización de dispositivos.
- `tailwindcss`: Framework CSS utility-first.

### Configuración de Contenedores

#### Construcción de Imágenes
- **Auth Service**: Multi-stage build (Node 22-alpine), generación de Prisma Client en tiempo de build, usuario no-root.
- **IoT Manager**: Multi-stage build (Node 20-alpine), compilación TypeScript a JavaScript, usuario no-root.
- **Webapp**: Pre-build externo (Vite), servida por Caddy con configuración Caddyfile para TLS automático.

#### Variables de Entorno Críticas
- `DATABASE_URL`: Conexión PostgreSQL con credenciales.
- `CRYPTO_MASTER_KEY`: Clave maestra para cifrado de claves privadas (Base64 32 bytes).
- `API_KEY_ENCRYPTION_KEY`: Clave para cifrado de API keys de ecosistemas (Base64 32 bytes).
- `JWT_PUBLIC_KEY` / `JWT_PRIVATE_KEY`: Par de claves RSA para firmas JWT.
- `FIREFLY_API_URL`: Endpoint de la blockchain Hyperledger.
- `MONGO_URI`: Connection string MongoDB.
- `REDIS_HOST`: Host del servicio Redis.

### Servicios de Monitorización y Administración

- **Seq**: Dashboard web para análisis de logs con búsqueda full-text y alertas.
- **Mongo Express**: Interfaz administrativa para MongoDB (expuesto solo a localhost).
- **Redis Commander**: Interfaz administrativa para Redis (expuesto solo a localhost).
- **Traefik Dashboard**: Panel de control del API Gateway (expuesto en /traefik).
- **Mailpit**: Interfaz web para inspección de correos electrónicos enviados en desarrollo.

Este diseño arquitectónico proporciona una separación clara de responsabilidades, escalabilidad horizontal para el servicio de IoT, persistencia polyglot (relacional + documental), y una capa de seguridad multicapa que incluye cifrado en reposo, autenticación robusta, y auditoría centralizada.