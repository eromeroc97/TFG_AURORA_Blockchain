# iot-manager — Endpoints

## Resumen

| #   | Método        | Path                                      | Rol Requerido | Auth                        | Handler                                             |
| --- | ------------- | ----------------------------------------- | ------------- | --------------------------- | --------------------------------------------------- |
| 1   | GET / OPTIONS | `/health`                                 | — (público)   | Ninguna                     | inline (`src/index.ts:325-341`)                     |
| 2   | GET           | `/iot/devices/last-interaction`           | — (público)   | Ninguna                     | `readQueryLastInteraction` (`src/index.ts:352-368`) |
| 3   | GET           | `/devices/last-interaction`               | — (público)   | Ninguna                     | `readQueryLastInteraction` (`src/index.ts:352-368`) |
| 4   | GET           | `/iot/devices/:deviceId/last-interaction` | — (público)   | Ninguna                     | `readParamLastInteraction` (`src/index.ts:373-388`) |
| 5   | GET           | `/devices/:deviceId/last-interaction`     | — (público)   | Ninguna                     | `readParamLastInteraction` (`src/index.ts:373-388`) |
| 6   | GET           | `/devices/device-details`                 | — (público)   | Ninguna                     | `readDeviceDetails` (`src/index.ts:393-411`)        |
| 7   | GET           | `/v1/metrics`                             | ANY           | JWT Bearer                  | `telemetryMetricsHandler` (`src/index.ts:415-439`)  |
| 8   | GET           | `/api/telemetry/v1/metrics`               | ANY           | JWT Bearer                  | `telemetryMetricsHandler` (`src/index.ts:415-439`)  |
| 9   | GET           | `/v1/volume`                              | ADMIN         | JWT Bearer / Internal Token | `telemetryVolumeHandler` (`src/index.ts:444-497`)   |
| 10  | GET           | `/api/telemetry/v1/volume`                | ADMIN         | JWT Bearer / Internal Token | `telemetryVolumeHandler` (`src/index.ts:444-497`)   |
| 11  | POST          | `/v1/ingest`                              | API Key       | API Key (`x-api-key`)       | handler inline (`src/index.ts:830-939`)             |

**Total**: 11 rutas (8 únicas + 3 alias). Todos los paths están en `src/index.ts`.

---

## Tabla Detallada

### Endpoint #1 — Health (OPTIONS)

|                     |                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------- |
| **Método**          | `OPTIONS`                                                                          |
| **Path**            | `/health`                                                                          |
| **Handler**         | inline, `src/index.ts:325-331`                                                     |
| **Rol Requerido**   | — (público, sin autenticación)                                                     |
| **Ubicación Check** | Ninguna                                                                            |
| **Auth**            | Ninguna                                                                            |
| **Query Params**    | —                                                                                  |
| **Notas**           | Manejador CORS preflight. Permite `GET,OPTIONS` con `Content-Type,Accept` headers. |

---

### Endpoint #2 — Health (GET)

|                     |                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------ |
| **Método**          | `GET`                                                                                      |
| **Path**            | `/health`                                                                                  |
| **Handler**         | inline, `src/index.ts:333-341`                                                             |
| **Rol Requerido**   | — (público, sin autenticación)                                                             |
| **Ubicación Check** | Ninguna                                                                                    |
| **Auth**            | Ninguna                                                                                    |
| **Query Params**    | —                                                                                          |
| **Notas**           | Retorna `{ status: "UP", service: "iot-manager" }`. CORS `Access-Control-Allow-Origin: *`. |

---

### Endpoint #3 — Last Interaction por Query

|                     |                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| **Método**          | `GET`                                                                                                 |
| **Path**            | `/iot/devices/last-interaction`                                                                       |
| **Handler**         | `readQueryLastInteraction`, `src/index.ts:352-368`                                                    |
| **Rol Requerido**   | — (público, sin autenticación)                                                                        |
| **Ubicación Check** | Ninguna                                                                                               |
| **Auth**            | Ninguna                                                                                               |
| **Query Params**    | `macAddress` (required), `ecosystemId` (required)                                                     |
| **Notas**           | Alias en `/devices/last-interaction` (endpoint #4). Retorna `{ lastInteractionAt: ISO8601 \| null }`. |

---

### Endpoint #4 — Last Interaction por Query (alias)

|                     |                                                                                   |
| ------------------- | --------------------------------------------------------------------------------- |
| **Método**          | `GET`                                                                             |
| **Path**            | `/devices/last-interaction`                                                       |
| **Handler**         | `readQueryLastInteraction`, `src/index.ts:352-368`                                |
| **Rol Requerido**   | — (público, sin autenticación)                                                    |
| **Ubicación Check** | Ninguna                                                                           |
| **Auth**            | Ninguna                                                                           |
| **Query Params**    | `macAddress` (required), `ecosystemId` (required)                                 |
| **Notas**           | Alias de `/iot/devices/last-interaction` (endpoint #3). Misma lógica y respuesta. |

---

### Endpoint #5 — Last Interaction por Device ID

|                     |                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Método**          | `GET`                                                                                                                                            |
| **Path**            | `/iot/devices/:deviceId/last-interaction`                                                                                                        |
| **Handler**         | `readParamLastInteraction`, `src/index.ts:373-388`                                                                                               |
| **Rol Requerido**   | — (público, sin autenticación)                                                                                                                   |
| **Ubicación Check** | Ninguna                                                                                                                                          |
| **Auth**            | Ninguna                                                                                                                                          |
| **Path Params**     | `deviceId` (required)                                                                                                                            |
| **Notas**           | Alias en `/devices/:deviceId/last-interaction` (endpoint #6). Resuelve deviceId a macAddress via `telemetryStore.findLastInteraction(deviceId)`. |

---

### Endpoint #6 — Last Interaction por Device ID (alias)

|                     |                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------- |
| **Método**          | `GET`                                                                                       |
| **Path**            | `/devices/:deviceId/last-interaction`                                                       |
| **Handler**         | `readParamLastInteraction`, `src/index.ts:373-388`                                          |
| **Rol Requerido**   | — (público, sin autenticación)                                                              |
| **Ubicación Check** | Ninguna                                                                                     |
| **Auth**            | Ninguna                                                                                     |
| **Path Params**     | `deviceId` (required)                                                                       |
| **Notas**           | Alias de `/iot/devices/:deviceId/last-interaction` (endpoint #5). Misma lógica y respuesta. |

---

### Endpoint #7 — Device Details

|                     |                                                                               |
| ------------------- | ----------------------------------------------------------------------------- |
| **Método**          | `GET`                                                                         |
| **Path**            | `/devices/device-details`                                                     |
| **Handler**         | `readDeviceDetails`, `src/index.ts:393-411`                                   |
| **Rol Requerido**   | — (público, sin autenticación)                                                |
| **Ubicación Check** | Ninguna                                                                       |
| **Auth**            | Ninguna                                                                       |
| **Query Params**    | `macAddress` (required), `ecosystemId` (required)                             |
| **Notas**           | Retorna el último payload de un dispositivo. Respuesta: `{ payload: {...} }`. |

---

### Endpoint #8 — Métricas de Telemetría

|                     |                                                                                                                                                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Método**          | `GET`                                                                                                                                                                                                                                                                |
| **Path**            | `/v1/metrics`                                                                                                                                                                                                                                                        |
| **Handler**         | `telemetryMetricsHandler`, `src/index.ts:415-439`                                                                                                                                                                                                                    |
| **Rol Requerido**   | **ANY** (USER, ADMIN, GLOBAL_ADMIN)                                                                                                                                                                                                                                  |
| **Ubicación Check** | `src/index.ts:416` — llama a `resolveTelemetryRequestContext(request, reply)`                                                                                                                                                                                        |
| **Check detalle**   | `src/index.ts:675-779` (`resolveTelemetryRequestContext`): extrae `role` de JWT (`claims.role` o `claims.roles[0]`), verifica presencia de `role` + `userId`/`identityId`/`sub`. No hay verificación de rol específico — cualquier token válido con rol es aceptado. |
| **Auth**            | JWT Bearer Token (`Authorization: Bearer <token>`)                                                                                                                                                                                                                   |
| **Query Params**    | `range` (opcional): `30m`, `1h`, `12h`, `24h` (default), `1w`, `1M`, `1y`                                                                                                                                                                                            |
| **Notas**           | Filtra datos por ecosistema según rol. USER: solo sus `ecosystemIds`. ADMIN/GLOBAL_ADMIN: sin filtro (`ecosystemIds = undefined` = todos). Alias en `/api/telemetry/v1/metrics` (endpoint #9).                                                                       |
| **Errores**         | 401 `AUTHORIZATION_REQUIRED` (sin token), 401 `INVALID_TOKEN` (JWT inválido), 401 `INVALID_SESSION_CLAIMS` (sin role/userId), 403 `USER_ECOSYSTEM_ACCESS_REQUIRED` / `NO_ECOSYSTEM_ACCESS` (USER sin ecosistemas).                                                   |

---

### Endpoint #9 — Métricas de Telemetría (alias)

|                     |                                                                 |
| ------------------- | --------------------------------------------------------------- |
| **Método**          | `GET`                                                           |
| **Path**            | `/api/telemetry/v1/metrics`                                     |
| **Handler**         | `telemetryMetricsHandler`, `src/index.ts:415-439`               |
| **Rol Requerido**   | **ANY** (USER, ADMIN, GLOBAL_ADMIN)                             |
| **Ubicación Check** | `src/index.ts:416` → `src/index.ts:675-779`                     |
| **Auth**            | JWT Bearer Token                                                |
| **Query Params**    | `range` (opcional)                                              |
| **Notas**           | Alias de `/v1/metrics` (endpoint #8). Misma lógica y respuesta. |

---

### Endpoint #10 — Volumen por Ecosistema

|                       |                                                                                                                                                                                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Método**            | `GET`                                                                                                                                                                                                                                                                                                                                                        |
| **Path**              | `/v1/volume`                                                                                                                                                                                                                                                                                                                                                 |
| **Handler**           | `telemetryVolumeHandler`, `src/index.ts:444-497`                                                                                                                                                                                                                                                                                                             |
| **Rol Requerido**     | **ADMIN** (ADMIN o GLOBAL_ADMIN)                                                                                                                                                                                                                                                                                                                             |
| **Ubicaciones Check** | **1)** `src/index.ts:453-458` — Internal token bypass: si `token === iotManagerInternalToken`, se asigna rol ADMIN con `ecosystemIds: null`. **2)** `src/index.ts:460` — `resolveTelemetryRequestContext()` para JWT normal. **3)** `src/index.ts:483-485` — ADMIN/GLOBAL_ADMIN acceden a cualquier ecosistema en query param; otros roles solo a los suyos. |
| **Auth**              | JWT Bearer Token (`Authorization: Bearer <token>`) **o** Internal Token (`IOT_MANAGER_INTERNAL_TOKEN` config)                                                                                                                                                                                                                                                |
| **Query Params**      | `ecosystemIds` (required, comma-separated)                                                                                                                                                                                                                                                                                                                   |
| **Notas**             | ADMIN/GLOBAL_ADMIN pueden pedir cualquier `ecosystemIds`. USER/otros roles solo los suyos (filtrado en línea 483-485). Retorna `{ volume: {...} }`. Alias en `/api/telemetry/v1/volume` (endpoint #11).                                                                                                                                                      |
| **Errores**           | 400 `INVALID_REQUEST` (sin params), 403 `FORBIDDEN` (USER pide ecosistema no suyo), 401 en `resolveTelemetryRequestContext`.                                                                                                                                                                                                                                 |

---

### Endpoint #11 — Volumen por Ecosistema (alias)

|                       |                                                                    |
| --------------------- | ------------------------------------------------------------------ |
| **Método**            | `GET`                                                              |
| **Path**              | `/api/telemetry/v1/volume`                                         |
| **Handler**           | `telemetryVolumeHandler`, `src/index.ts:444-497`                   |
| **Rol Requerido**     | **ADMIN** (ADMIN o GLOBAL_ADMIN)                                   |
| **Ubicaciones Check** | `src/index.ts:453-458`, `src/index.ts:460`, `src/index.ts:483-485` |
| **Auth**              | JWT Bearer Token o Internal Token                                  |
| **Query Params**      | `ecosystemIds` (required, comma-separated)                         |
| **Notas**             | Alias de `/v1/volume` (endpoint #10). Misma lógica y respuesta.    |

---

### Endpoint #12 — Ingest de Telemetría

|                     |                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Método**          | `POST`                                                                                                                                                                                                                                                                                                                                                                    |
| **Path**            | `/v1/ingest`                                                                                                                                                                                                                                                                                                                                                              |
| **Handler**         | inline, `src/index.ts:830-939`                                                                                                                                                                                                                                                                                                                                            |
| **Rol Requerido**   | **API Key** (sin rol — mapea directamente a `ecosystemId`)                                                                                                                                                                                                                                                                                                                |
| **Ubicación Check** | `src/index.ts:805` — `preHandler: authenticateApiKey` → `src/index.ts:502-584`                                                                                                                                                                                                                                                                                            |
| **Auth**            | API Key (`x-api-key` header)                                                                                                                                                                                                                                                                                                                                              |
| **Body**            | `{ latitude: number, longitude: number, devices: [{ mac_addr: string, ... }], timestamp?: ISO8601 }`                                                                                                                                                                                                                                                                      |
| **Notas**           | Valida API key contra Auth service (`POST /internal/users/validate-ecosystem`) o mapa estático (`iotApiKeyStaticMap`). La key se mapea a un `ecosystemId`. Cache Redis (TTL positivo configurable). Flujo: guardar → firmar (KMS via auth service) → broadcast (FireFly mock) → marcar ANCHORED. Retorna 202 `{ ingestId, status: "ACCEPTED", ecosystemId, hash, txId }`. |
| **Errores**         | 401 `API_KEY_REQUIRED` (sin header), 401 `API_KEY_INVALID`, 503 `AUTH_PROVIDER_UNAVAILABLE`, 400 `INVALID_TIMESTAMP`, 500 `SIGNING_FAILED` / `BROADCAST_FAILED`.                                                                                                                                                                                                          |

---

## Autenticación y Autorización

### 1. JWT Bearer Token

Usado por los endpoints `/v1/metrics`, `/v1/volume` y sus alias.

**Ubicación de validación**: `src/index.ts:675-779` (`resolveTelemetryRequestContext`)

**Flujo de validación**:

```
1. Extraer token de Authorization: Bearer <token>       → src/index.ts:679  (getBearerTokenFromHeader)
2. Decodificar JWT payload                              → src/index.ts:688  (decodeJwtPayload)
3. Extraer rol de claims.role o claims.roles[0]        → src/index.ts:697-698
4. Extraer userId de claims.userId/identityId/sub    → src/index.ts:699-702
5. Verificar presencia de role + userId              → src/index.ts:704-710
6. Resolver ecosystemIds (si no es ADMIN/GLOBAL_ADMIN) → src/index.ts:712-772
```

**Claims JWT usados**:

| Claim                                            | Extraído en   | Descripción                                          |
| ------------------------------------------------ | ------------- | ---------------------------------------------------- |
| `role` / `roles[0]`                              | Línea 697     | Rol del usuario (USER, ADMIN, GLOBAL_ADMIN, AUDITOR) |
| `userId`                                         | Línea 700     | Identificador principal                              |
| `identityId`                                     | Línea 701     | Fallback si `userId` vacío                           |
| `sub`                                            | Línea 702     | Fallback adicional                                   |
| `ecosystemIds` / `ecosystems` / `userEcosystems` | Línea 712-715 | Ecosistemas del usuario                              |

**Verificación de rol por endpoint**:

| Endpoint      | Roles aceptados                 | Comportamiento                                                                                                                 |
| ------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `/v1/metrics` | ANY (USER, ADMIN, GLOBAL_ADMIN) | USER ve solo sus ecosistemas. ADMIN/GLOBAL_ADMIN ven todos. No se rechazan roles específicos.                                  |
| `/v1/volume`  | ADMIN o GLOBAL_ADMIN            | ADMIN/GLOBAL_ADMIN acceden a cualquier ecosistema. USER/otros: se filtran a los suyos y se retorna 403 si pide alguno no suyo. |

**Respuesta de error JWT**:

| Código | Error                            | Causa                                                         |
| ------ | -------------------------------- | ------------------------------------------------------------- |
| 401    | `AUTHORIZATION_REQUIRED`         | Falta header `Authorization: Bearer`                          |
| 401    | `INVALID_TOKEN`                  | JWT malformado o firma inválida                               |
| 401    | `INVALID_SESSION_CLAIMS`         | Falta `role` o `userId`/`identityId`/`sub` en payload         |
| 403    | `USER_ECOSYSTEM_ACCESS_REQUIRED` | USER sin `ecosystemIds` en token y sin config de auth service |
| 403    | `NO_ECOSYSTEM_ACCESS`            | USER sin ecosistemas tras llamar al auth service              |
| 503    | `AUTH_SERVICE_UNAVAILABLE`       | Error al llamar al auth service por ecosistemas               |

---

### 2. API Key

Usado exclusivamente por `POST /v1/ingest`.

**Ubicación de validación**: `src/index.ts:502-584` (`authenticateApiKey` como `preHandler`)

**Flujo de validación**:

```
1. Extraer x-api-key del header          → src/index.ts:503 (getApiKeyFromHeader)
2. Cache Redis: búsqueda por hash      → src/index.ts:517-524
3. Cache negativo (keys inválidas)     → src/index.ts:529-541
4. Validar key (remoto o estático)     → src/index.ts:546-558 (apiKeyValidator)
   4a. Remote: POST a authValidateApiKeyUrl
   4b. Fallback: iotApiKeyStaticMap
5. Guardar en cache Redis (positivo)   → src/index.ts:573-578
6. Asignar authContext.ecosystemId    → src/index.ts:580-583
```

**Caché de API keys**:

| Tipo                | TTL configurable                        | Propósito                              |
| ------------------- | --------------------------------------- | -------------------------------------- |
| Positivo (válida)   | `iotApiKeyPositiveTtlMs` (default 600s) | Acelera requests repetidos             |
| Negativo (inválida) | `iotApiKeyNegativeTtlMs` (default 15s)  | Rechazo rápido de keys conocidas malas |

**Validación remota** (`src/index.ts:546-558`):
- Llama a `POST <authValidateApiKeyUrl>` en auth service
- Auth service busca la key en DB (desencriptada) y retorna `{ valid: true, ecosystemId }`
- Requiere `Authorization: Bearer <authInternalToken>` en la llamada al auth service

**Respuesta de error API Key**:

| Código | Error                       | Causa                                        |
| ------ | --------------------------- | -------------------------------------------- |
| 401    | `API_KEY_REQUIRED`          | Falta header `x-api-key`                     |
| 401    | `API_KEY_INVALID`           | Key no válida (no mapea a ningún ecosistema) |
| 503    | `AUTH_PROVIDER_UNAVAILABLE` | Error al llamar al servicio de validación    |

---

### 3. Internal Token

Usado por `GET /v1/volume` como bypass de autenticación JWT.

**Ubicación**: `src/index.ts:448-459`

**Condición**: `Authorization: Bearer <token>` donde `<token>` coincide exactamente con el valor de configuración `iotManagerInternalToken`.

**Efecto**: asigna `context = { role: 'ADMIN', userId: 'internal', ecosystemIds: null }`, otorgando acceso completo como ADMIN sin necesidad de JWT.

---

## Códigos de Error

### HTTP 4xx / 5xx

| Código | Error                            | Endpoint(s) | Causa                                                  |
| ------ | -------------------------------- | ----------- | ------------------------------------------------------ |
| 400    | `INVALID_REQUEST`                | #3-7, #10   | Faltan query/path params requeridos                    |
| 400    | `INVALID_DEVICE_ID`              | #5-6        | Falta `deviceId` en path                               |
| 400    | `INVALID_TIMESTAMP`              | #12         | `timestamp` no es ISO8601 válido                       |
| 401    | `AUTHORIZATION_REQUIRED`         | #8-11       | Falta `Authorization: Bearer <token>`                  |
| 401    | `INVALID_TOKEN`                  | #8-11       | JWT malformado, expirado o firma inválida              |
| 401    | `INVALID_SESSION_CLAIMS`         | #8-11       | Falta `role` o `userId` en JWT                         |
| 401    | `API_KEY_REQUIRED`               | #12         | Falta header `x-api-key`                               |
| 401    | `API_KEY_INVALID`                | #12         | API key no válida                                      |
| 403    | `USER_ECOSYSTEM_ACCESS_REQUIRED` | #8-11       | USER sin `ecosystemIds` y sin auth service configurado |
| 403    | `NO_ECOSYSTEM_ACCESS`            | #8-11       | USER sin ecosistemas asociados                         |
| 403    | `FORBIDDEN`                      | #10-11      | USER pide ecosistema fuera de sus permisos             |
| 503    | `AUTH_SERVICE_UNAVAILABLE`       | #8-11       | Error al resolver ecosistemas desde auth service       |
| 503    | `AUTH_PROVIDER_UNAVAILABLE`      | #12         | Error al validar API key                               |
| 500    | `SIGNING_FAILED`                 | #12         | Error del KMS al firmar datos                          |
| 500    | `BROADCAST_FAILED`               | #12         | Error al hacer broadcast a blockchain                  |

---

## Roles Definidos

Los roles se definen en `services/auth/prisma/schema.prisma:9-14`:

```prisma
enum Role {
  USER
  AUDITOR
  ADMIN
  GLOBAL_ADMIN
}
```

> **Nota**: AUDITOR está definido en el schema de la base de datos pero **no se utiliza actualmente en ningún endpoint de iot-manager**. Los endpoints `/v1/metrics` y `/v1/volume` aceptan cualquier rol autenticado (ANY) y AUDITOR no tiene comportamiento diferenciado implementado en este servicio.

### Comportamiento por Rol en iot-manager

| Rol              | `/v1/metrics`                            | `/v1/volume`                                                        | `/v1/ingest`                     |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------- | -------------------------------- |
| **USER**         | Ve solo sus ecosistemas (`ecosystemIds`) | Acceso filtrado a sus ecosistemas (puede recibir 403 si pide otros) | N/A (usa API key)                |
| **AUDITOR**      | Mismo que USER                           | Mismo que USER                                                      | N/A                              |
| **ADMIN**        | Ve todos los ecosistemas                 | Ve todos los ecosistemas                                            | N/A                              |
| **GLOBAL_ADMIN** | Ve todos los ecosistemas                 | Ve todos los ecosistemas                                            | N/A                              |
| **API Key**      | N/A                                      | N/A                                                                 | Mapea a `ecosystemId` específico |

---

## Referencia Rápida

### Rutas sin autenticación (públicas)

```
GET  /health
GET  /iot/devices/last-interaction?macAddress=...&ecosystemId=...
GET  /devices/last-interaction?macAddress=...&ecosystemId=...
GET  /iot/devices/:deviceId/last-interaction
GET  /devices/:deviceId/last-interaction
GET  /devices/device-details?macAddress=...&ecosystemId=...
```

### Rutas con JWT

```
GET  /v1/metrics?range=24h
GET  /api/telemetry/v1/metrics?range=24h
GET  /v1/volume?ecosystemIds=eco1,eco2     → requiere ADMIN
GET  /api/telemetry/v1/volume?ecosystemIds=... → requiere ADMIN
```

### Rutas con API Key

```
POST /v1/ingest
```
Headers: `x-api-key: <api-key>`
Body: `{ latitude, longitude, devices: [{ mac_addr }], timestamp? }`