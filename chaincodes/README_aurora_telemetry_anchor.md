# Aurora Telemetry Anchor - Hyperledger Fabric Chaincode

## Descripción
Smart contract desarrollado en Go para anclar telemetría IoT en Hyperledger Fabric mediante FireFly.

## Funciones del Contrato

### Invoke Functions

#### `AnchorTelemetry(ingestId, ecosystemId, telemetryHash, signature, publicKey)`
Persiste un nuevo anclaje de telemetría en el ledger de Fabric.
- **Prevención de duplicados**: Valida que `ingestId` no exista previamente en el world state
- **Validación**: Verifica formato SHA-256 (64 caracteres hex) del hash
- **Composite Key**: Crea clave compuesta `ecosystem.Anchor~{ecosystemId}~{anchoredAt}~{ingestId}` para consultas eficientes
- **Evento**: Emite chaincode event `TelemetryAnchored` con el JSON completo del anclaje

### Query Functions

#### `QueryByIngestID(ingestId)`
Recupera un anclaje usando su ID único (clave primaria en world state).

#### `QueryByHash(telemetryHash)`
Lista todos los anclajes que comparten el mismo hash SHA-256.
Útil cuando el mismo contenido se ingesta en diferentes momentos (distintos `ingestId`).

#### `QueryByEcosystem(ecosystemId, startTime, endTime)`
Lista anclajes de un ecosistema, opcionalmente filtrados por rango de tiempo ISO-8601.
Utiliza composite keys para evitar full ledger scan.

## Estructura de Datos

```go
type TelemetryAnchor struct {
    IngestID      string  // ID interno de iot-manager (MongoDB _id)
    EcosystemID   string  // Ecosistema propietario
    TelemetryHash string  // SHA-256 del payload (incluye GPS)
    Signature     string  // Firma emitida por auth-service (KMS)
    PublicKey     string  // Clave pública del firmante
    AnchorTxID    string  // ID de transacción Fabric (para localizar bloque)
    AnchoredAt    string  // Timestamp ISO-8601 del anclaje
}
```

## Integración con FireFly

### 1. Empaquetado
```bash
cd chaincodes/aurora-telemetry-anchor
tar -czf ../aurora-telemetry-anchor.tgz main.go go.mod
```

### 2. Despliegue vía FireFly CLI
```bash
ff deploy chaincode \
  --name aurora-telemetry-anchor \
  --path ../aurora-telemetry-anchor.tgz \
  --channel mychannel
```

### 3. Invocación desde iot-manager
```typescript
// POST /api/v1/namespaces/default/contracts/{contractId}/invoke/AnchorTelemetry
const response = await firefly.post(
  `/contracts/${contractId}/invoke/AnchorTelemetry`,
  {
    input: {
      ingestId: savedTelemetry.id,
      ecosystemId: ecosystemId,
      telemetryHash: hash,
      signature: signingResult.signature,
      publicKey: signingResult.publicKey
    }
  }
);
// La respuesta incluye el txId real de Fabric
```

## Eventos Chaincode
El evento `TelemetryAnchored` permite a FireFly notificar a iot-manager:
- iot-manager actualiza MongoDB: `ANCHORED`, `signature`, `publicKey`, `txId`
- El servicio de auditoría (stateless) puede suscribirse a estos eventos

## Notas de Diseño
- **GPS no se almacena**: El hash SHA-256 ya incluye lat/long, suficiente para auditoría
- **Timestamp independiente**: El `anchoredAt` del anclaje es independiente del timestamp de ingesta
- **Duplicados por contenido permitidos**: Mismo hash en tiempos distintos genera distintos `ingestId`
- **Duplicados por tiempo bloqueados**: Mismo `ingestId` falla por existencia en world state
