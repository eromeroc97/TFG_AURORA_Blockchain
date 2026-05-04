# Chaincodes - Aurora Blockchain TFG

## Descripción
Esta carpeta contiene los smart contracts (chaincodes) desarrollados en Go para Hyperledger Fabric, desplegados a través de FireFly.

## Prerrequisitos
- FireFly CLI instalado (`ff --version` para verificar)
- Stack de FireFly en ejecución (namespace por defecto: `default`, canal: `aurorasmarthome`)
- Go 1.21+ instalado (para empaquetar dependencias)

## Despliegue de Chaincodes en FireFly

### Paso 1: Empaquetar el Chaincode
Empaqueta el código fuente y dependencias en un `.tgz` (desde bash):

```bash
# Navegar al directorio raíz del proyecto
cd /ruta/al/proyecto/TFG_AURORA_Blockchain

# Descargar dependencias y generar go.sum (requiere Go instalado)
cd chaincodes/aurora-telemetry-anchor
go mod tidy
cd ../..

# Empaquetar el chaincode
tar -czf chaincodes/aurora-telemetry-anchor.tgz \
  chaincodes/aurora-telemetry-anchor/main.go \
  chaincodes/aurora-telemetry-anchor/go.mod \
  chaincodes/aurora-telemetry-anchor/go.sum
```

> **Nota**: Si no tienes Go instalado, el archivo `go.sum` no se generará. El chaincode podría funcionar si las dependencias en `go.mod` son correctas, pero es recomendable usar `go mod tidy`.

### Paso 2: Desplegar en FireFly (Namespace Default + Canal aurorasmarthome)
Usa el CLI de FireFly para instalar, aprobar y confirmar el chaincode en el canal `aurorasmarthome` y namespace `default`:

```bash
ff deploy chaincode \
  --name aurora-telemetry-anchor \
  --path ./chaincodes/aurora-telemetry-anchor.tgz \
  --channel aurorasmarthome \
  --namespace default
```

> **Verificar canal**: Lista canales disponibles:
> ```bash
> ff get channels --namespace default
> ```

### Paso 3: Obtener ID del Contrato
Tras despliegue exitoso, FireFly devuelve el `contractId`. También puedes consultarlo:
```bash
ff get contracts --namespace default | grep aurora-telemetry-anchor
```

### Paso 4: Verificar Despliegue
Consulta los detalles del contrato desplegado:
```bash
ff get contract --namespace default --id <CONTRACT_ID>
```

## Invocación de Funciones (Ejemplo Bash)
Invoca `AnchorTelemetry` usando el CLI de FireFly:
```bash
ff invoke contract \
  --namespace default \
  --id <CONTRACT_ID> \
  --method AnchorTelemetry \
  --params '{
    "ingestId": "test-ingest-001",
    "ecosystemId": "eco-test-1",
    "telemetryHash": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
    "signature": "mock-signature-abc123",
    "publicKey": "mock-public-key-xyz789"
  }'
```

## Lista de Chaincodes
| Chaincode | Descripción |
|-----------|-------------|
| `aurora-telemetry-anchor/` | Anclaje de telemetría IoT: persiste hash firmado, previene duplicados por `ingestId`, emite evento `TelemetryAnchored` |
