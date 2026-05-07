# Audit Service - Aurora Blockchain TFG

## Descripción
Servicio **stateless** que permite consultar los anclajes de telemetría almacenados en **Hyperledger Fabric** a través de **FireFly**.

Este servicio actúa como **backend del AuditDashboard** en la webapp, proporcionando:
- Consulta de anclajes por ID, hash o ecosistema
- Construcción de la **línea de tiempo (timeline)** de anclajes
- **Estado y estadísticas** de la blockchain
- Datos para **representación visual** de la cadena de bloques

## Arquitectura

```
[Webapp AuditDashboard]
        ↓ (HTTP/REST)
[services/audit] (stateless) ←→ [FireFly APIs] ←→ [Hyperledger Fabric]
```

### Características
- **Sin base de datos propia**: Consulta siempre a blockchain vía FireFly
- **Solo lectura**: No puede modificar el ledger, solo lee
- **Agregación de datos**: Combina datos del chaincode + operaciones FireFly
- **Frontend-ready**: Respuestas estructuradas para renderizado directo

## Fuentes de Datos

### Chaincode: `aurora-telemetry-anchor`
- **Acceso**: Vía API de FireFly (`GET /api/v1/namespaces/{ns}/contracts/{contractId}/query/{method}`)
- **Funciones Query**:
  - `QueryByIngestID(ingestId)` - Recupera anclaje por ID
  - `QueryByHash(telemetryHash)` - Lista anclajes por hash
  - `QueryByEcosystem(ecosystemId, startTime, endTime)` - Lista por ecosistema

### FireFly APIs
- `/api/v1/namespaces/{ns}/transactions` - Transacciones FireFly
- `/api/v1/namespaces/{ns}/operations?type=blockchain_*` - Operaciones blockchain
- `/api/v1/namespaces/{ns}/events` - Eventos de chaincode (`TelemetryAnchored`)

## Endpoints

### Health Check
```
GET /health
```

### Consulta de Anclajes
```
GET /audit/ingest/:ingestId
```
Recupera un anclaje por su ID de ingesta (clave primaria).

```
GET /audit/hash/:hash
```
Lista todos los anclajes que comparten el mismo hash SHA-256.

```
GET /audit/ecosystem/:ecosystemId?startTime=&endTime=
```
Lista anclajes de un ecosistema, opcionalmente filtrados por rango de tiempo ISO-8601.

### Línea de Tiempo
```
GET /audit/timeline?ecosystemId=&start=&end=&limit=50&offset=0
```
Timeline de anclajes con paginación.

```
GET /audit/timeline/blocks?startBlock=&endBlock=
```
Timeline de bloques con sus transacciones.

### Estado Blockchain
```
GET /audit/stats
```
Estadísticas generales: total anclajes, tasa éxito, ecosistemas activos, total bloques.

```
GET /audit/stats/realtime?minutes=60
```
Métricas en tiempo real (últimos N minutos).

### Visualización
```
GET /audit/chain/visual?startBlock=&endBlock=&limit=50
```
Representación simplificada de la cadena para UI.

```
GET /audit/block/:blockNumber
```
Detalles de un bloque específico y sus transacciones.

## Autenticación y Autorización

- **JWT Bearer Token** requerido en header `Authorization`
- Validación de firma usando `JWT_PUBLIC_KEY`
- **Roles** (extraídos del JWT):
  - `AUDITOR`: Acceso global a todos los ecosistemas
  - `ADMIN` / `GLOBAL_ADMIN`: Acceso según permisos
  - `USER`: Solo sus ecosistemas asociados

## Estructura de Respuestas

### Timeline (`/audit/timeline`)
```json
{
  "timeline": [
    {
      "timestamp": "2026-05-04T12:00:00.000Z",
      "type": "anchor",
      "ingestId": "507f1f77bcf86cd799439011",
      "ecosystemId": "eco-001",
      "telemetryHash": "a1b2c3d4...f6",
      "txId": "abc123...",
      "blockNumber": 12345
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}
```

### Estadísticas (`/audit/stats`)
```json
{
  "totalAnchors": 1500,
  "successRate": 98.5,
  "byEcosystem": [
    { "ecosystemId": "eco-001", "count": 800, "percentage": 53.3 }
  ],
  "byHour": [
    { "hour": "2026-05-04T12:00:00.000Z", "count": 45 }
  ],
  "avgAnchorsPerBlock": 3.2,
  "totalBlocks": 12345,
  "totalTransactions": 1500,
  "lastBlockNumber": 12345
}
```

### Visualización de Cadena (`/audit/chain/visual`)
```json
{
  "chain": [
    {
      "blockNumber": 12345,
      "blockHash": "0xabc...",
      "parentHash": "0xdef...",
      "timestamp": "2026-05-04T12:00:00.000Z",
      "transactionCount": 3,
      "transactions": [
        { "txId": "abc123", "type": "anchor", "ingestId": "507f..." }
      ]
    }
  ],
  "summary": {
    "totalBlocks": 12345,
    "totalTransactions": 1500,
    "chainHealth": "healthy",
    "latestBlockNumber": 12345,
    "latestBlockTime": "2026-05-04T12:00:00.000Z"
  }
}
```

## Variables de Entorno

Ver `.env.example` para la configuración necesaria.

## Notas de Diseño

- **Stateless**: No tiene base de datos propia, consulta siempre a blockchain vía FireFly
- **Agregación**: Combina datos del chaincode + operaciones FireFly
- **Optimización**: Usa parámetros `limit`, `skip`, `sort` de FireFly Query Syntax
- **Caché opcional**: Redis para estadísticas frecuentes (configurable)
- **Verificación opcional**: Podría verificar la firma `signature` usando `publicKey` para validar integridad
- **Búsqueda por bloque**: El `anchorTxId` permite localizar el bloque exacto en Fabric para auditoría forense

## Integración con Webapp

Este servicio nutre directamente al **AuditDashboard** en la webapp. Ver `CAMBIOS_WEBAPP.md` para detalles completos de los cambios necesarios en el frontend.
