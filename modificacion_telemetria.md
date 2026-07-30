# Modificación: Respuesta asíncrona en ingesta de telemetría

## Objetivo

Reducir la latencia de la petición `POST /v1/ingest` respondiendo inmediatamente después de persistir los datos en MongoDB, dejando el anclaje en blockchain (firma digital + FireFly) para un proceso en segundo plano con reintentos automáticos.

---

## Flujo actual (síncrono)

```
Petición → Validar API key → Hash SHA-256 → MongoDB INSERT (PENDING_ANCHOR)
         → Auth signing → FireFly anchor → MongoDB UPDATE (ANCHORED)
         → HTTP 202 Response
```

La respuesta se envía **al final**, después de que FireFly haya confirmado el anchor.

## Flujo nuevo (asíncrono)

```
Petición → Validar API key → Hash SHA-256 → MongoDB INSERT (PENDING_ANCHOR)
         → HTTP 202 Response  ← inmediato
         └── Background task (con reintentos):
              → Auth signing
              → FireFly anchor
              → MongoDB UPDATE (ANCHORED)
```

El punto de no retorno es el **INSERT en MongoDB**. Si el proceso se cae después, al arrancar se recuperan los registros huérfanos (`PENDING_ANCHOR`) y se reprocesan.

---

## Archivos a modificar

### 1. `services/iot-manager/src/telemetry-store.ts`

**Añadir a la interfaz `TelemetryStore`:**

```typescript
findPendingAnchors(): Promise<Array<{
  telemetryId: string;
  ecosystemId: string;
  hash: string;
}>>;
```

**Añadir a `MongoTelemetryStore`:**

```typescript
async findPendingAnchors() {
  const collection = await this.ensureCollection();
  return collection
    .find({ 'metadata.anchorStatus': 'PENDING_ANCHOR' })
    .project({
      'metadata.telemetryId': 1,
      'metadata.ecosystemId': 1,
      hash: 1,
      _id: 0,
    })
    .toArray();
}
```

---

### 2. `services/iot-manager/src/index.ts`

#### 2.1 Background function con reintentos

```typescript
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2_000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const processAnchorInBackground = async (
  ingestId: string,
  ecosystemId: string,
  hash: string,
  log: FastifyRequest['log'],
): Promise<void> => {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Paso 5: Auth signing
      const signResponse = await fetch(config.authSignUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.authInternalToken}`,
        },
        body: JSON.stringify({ ecosystemId, hash }),
      });

      if (!signResponse.ok) {
        throw new Error(`Sign request failed: ${signResponse.status}`);
      }

      const { signature, publicKey } = (await signResponse.json()) as {
        signature: string;
        publicKey: string;
      };

      // Paso 7: FireFly anchor
      const txId = await fireflyService.anchorTelemetry({
        ingestId,
        ecosystemId,
        telemetryHash: hash,
        signature,
        publicKey,
      });

      // Paso 8: MongoDB UPDATE a ANCHORED
      await telemetryStore.updateAnchorStatus(
        ingestId,
        'ANCHORED',
        signature,
        publicKey,
        txId,
      );

      log.info(
        { ingestId, txId, attempt },
        'Background anchoring completed successfully',
      );
      return; // éxito
    } catch (error) {
      log.error(
        { error, ingestId, attempt, maxRetries: MAX_RETRIES },
        'Background anchoring attempt failed',
      );

      if (attempt < MAX_RETRIES - 1) {
        // Exponential backoff: 2s, 4s, 8s, 16s
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
      }
    }
  }

  // Todos los reintentos agotados → marcar como FAILED
  log.error({ ingestId }, 'Background anchoring failed after all retries');
  await telemetryStore.updateAnchorStatus(ingestId, 'FAILED', '', '');
};
```

#### 2.2 Startup recovery

```typescript
const recoverPendingAnchors = async (log: FastifyRequest['log']) => {
  try {
    const pending = await telemetryStore.findPendingAnchors();
    if (pending.length > 0) {
      log.info({ count: pending.length }, 'Recovering pending anchors');
      for (const item of pending) {
        processAnchorInBackground(
          item.telemetryId,
          item.ecosystemId,
          item.hash,
          log,
        );
      }
    }
  } catch (error) {
    log.error({ error }, 'Failed to recover pending anchors');
  }
};
```

Llamar en `buildApp` después de inicializar `telemetryStore`:

```typescript
// Al final de buildApp, antes de return app
void Promise.resolve().then(async () => {
  await recoverPendingAnchors(app.log);
});
```

Opcional: añadir también un `setInterval` periódico (ej. cada 5 minutos):

```typescript
const RECOVERY_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => recoverPendingAnchors(app.log), RECOVERY_INTERVAL_MS);
```

#### 2.3 Handler modificado

**Antes** (líneas 820–935): todo síncrono.

**Después:**

```typescript
async (request: FastifyRequest<{ Body: IngestRequestBody }>, reply) => {
  // Validación auth context (igual)
  // Parse timestamp (igual)
  // Calcular hash (igual)
  // Calcular tamaño (igual)

  // Paso 3: Persistir con PENDING_ANCHOR
  const savedTelemetry = await telemetryStore.save({
    ecosystemId,
    latitude: request.body.latitude,
    longitude: request.body.longitude,
    payload,
    hash,
    timestamp: eventTimestamp,
    sizeBytes: rawBodyBytes,
  });

  // Background: firmar + anclar en FireFly + actualizar MongoDB
  void processAnchorInBackground(
    savedTelemetry.id,
    ecosystemId,
    hash,
    request.log,
  );

  // Device discovery (background, como antes)
  void Promise.resolve().then(async () => {
    await deviceDiscovery.discoverAndSync(
      { ecosystemId, devices: request.body.devices },
      request.log,
    );
  });

  // Responder inmediatamente
  return reply.code(202).send({
    status: 'ACCEPTED',
    message: 'Telemetry data received and stored successfully',
    ingestId: savedTelemetry.id,
  });
};
```

**Cambios en la respuesta:**

| Campo | Antes | Después |
|-------|-------|---------|
| `status` | `ACCEPTED` | `ACCEPTED` |
| `ecosystemId` | ✅ | ❌ |
| `hash` | ✅ | ❌ |
| `txId` | ✅ | ❌ |
| `ingestId` | ✅ | ✅ |
| `receivedAt` | ✅ | ❌ |
| `message` | ❌ | ✅ |

Si se prefiere mantener `ingestId` y `hash` para trazabilidad, se pueden conservar sin problema.

---

### 3. `services/iot-manager/src/index.spec.ts`

#### Tests a actualizar

1. **Happy path** (líneas 206–272):
   - Cambiar aserciones para no esperar `txId` en la respuesta
   - Verificar que response.statusCode sigue siendo `202`
   - Verificar que `savedInputs` sigue teniendo 1 elemento

2. **Test `SIGNING_FAILED`** (líneas 435–478):
   - El error es asíncrono: la respuesta ahora es `202` (no `500`)
   - El test puede reescribirse para:
     - Mockear `processAnchorInBackground` o `fetch` para que falle
     - Verificar que `updateAnchorStatus` se llamó con `FAILED`
   - O eliminarse si se decide que la responsabilidad del test corresponde a otro nivel

3. **Test `BROADCAST_FAILED`**:
   - Mismo caso que `SIGNING_FAILED`

#### Tests a añadir

4. **Background anchoring success**:
   - Mockear `fetch` y `fireflyService.anchorTelemetry` para éxito
   - Verificar que al final el documento tiene estado `ANCHORED`

5. **Background anchoring retry then fail**:
   - Mockear para que falle N veces y luego tenga éxito
   - Verificar que eventualmente se llama a `updateAnchorStatus` con `ANCHORED`

6. **findPendingAnchors**:
   - Test unitario del nuevo método en `MongoTelemetryStore`

---

## Archivos que NO cambian

| Archivo | Motivo |
|---------|--------|
| `firefly-service.ts` | No requiere cambios |
| `config.ts` | No requiere cambios |
| `device-discovery.ts` | No requiere cambios |
| `api-key-cache.ts` | No requiere cambios |

---

## Consideraciones

### Consistencia de datos

- Si el proceso se cae **antes** del INSERT en MongoDB: el cliente recibe error de conexión y debe reintentar.
- Si el proceso se cae **después** del INSERT pero **antes** de responder: el cliente recibe timeout, pero los datos están en MongoDB. Puede reintentar (se insertará duplicado, pero con diferente `telemetryId`).
- Si el proceso se cae **después** de responder: el startup recovery recoge los `PENDING_ANCHOR` huérfanos y los reprocesa.

### Reintentos exponenciales

```
Intento 1: espera 2s
Intento 2: espera 4s
Intento 3: espera 8s
Intento 4: espera 16s
Intento 5: último (sin espera)
```

Si FireFly está caído 30 segundos, el anchor se completa en el intento 4 o 5. Si está caído más tiempo, se marca como `FAILED` y el recovery periódico lo reintentará más tarde.

### FireFly idempotencia

FireFly/Hyperledger Fabric debería ser idempotente para el mismo `ingestId` y `telemetryHash`. Si se reintenta un anchor que ya se completó en FireFly pero el proceso murió antes de actualizar MongoDB a `ANCHORED`, el reintento podría crear una transacción duplicada en Fabric. Verificar si FireFly maneja idempotencia por `ingestId`. Si no, habrá que considerar un mecanismo de deduplicación.
