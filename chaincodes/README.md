# Chaincodes - Aurora Blockchain TFG

## Descripción
Esta carpeta contiene los smart contracts (chaincodes) desarrollados en Go para la red Hyperledger Fabric y orquestados a través de Hyperledger FireFly.

## Prerrequisitos
- **FireFly CLI** instalado (`ff --version` para verificar).
- **Docker** instalado y en ejecución (vital para empaquetar los contratos con las herramientas oficiales de Fabric).
- Stack de FireFly en ejecución (puedes verificar su estado con `ff ls`).

---

## 🚀 Guía de Despliegue de Chaincodes

El despliegue consta de dos fases críticas: empaquetar el código con el estándar exacto de Fabric y enviarlo a la red a través de FireFly.

### Paso 1: Empaquetar el Chaincode (Vía Docker)
Hyperledger Fabric exige que los paquetes tengan una estructura interna específica (`metadata.json` + `code.tar.gz`). En lugar de instalar binarios de Fabric en tu máquina, usamos su contenedor oficial.

1. Abre tu terminal y navega hasta esta misma carpeta (`/chaincodes`).
2. Ejecuta el siguiente comando, sustituyendo las variables `<...>` por tus datos:

```bash
docker run --rm -v $PWD:/workspace -w /workspace hyperledger/fabric-tools:2.4 \
  peer lifecycle chaincode package <NOMBRE_PAQUETE>.tgz \
  --path ./<CARPETA_DEL_CHAINCODE> \
  --lang golang \
  --label <NOMBRE_CHAINCODE>_<VERSION>
```

**⚠️ REGLA DE ORO PARA EL LABEL:** 
El parámetro `--label` debe ser **ESTRICTAMENTE** el nombre del chaincode seguido de un guion bajo y la versión (ej. `aurora-telemetry-anchor_1.0`). Si esta etiqueta no coincide exactamente con lo que le digas a FireFly en el Paso 2, la instalación fallará.

**Ejemplo real para el chaincode de Telemetría:**
```bash
docker run --rm -v $PWD:/workspace -w /workspace hyperledger/fabric-tools:2.4 peer lifecycle chaincode package aurora-pkg.tgz --path ./aurora-telemetry-anchor --lang golang --label aurora-telemetry-anchor_1.0
```

### Paso 2: Desplegar en la red con FireFly
Una vez generado el archivo `.tgz`, utilizamos la CLI de FireFly para instalarlo en los *peers*, aprobarlo y hacer el *commit* en el canal.

La sintaxis del comando es:
```bash
ff deploy fabric <NOMBRE_STACK> <ARCHIVO.tgz> <CANAL> <NOMBRE_CHAINCODE> <VERSION>
```

**Ejemplo real de despliegue:**
```bash
ff deploy fabric red-tfg aurora-pkg.tgz firefly aurora-telemetry-anchor 1.0
```
*(Nota: El canal por defecto que crea FireFly se llama `firefly`)*.

---

## 📡 Verificación e Invocación (API REST)

A diferencia de Fabric puro, FireFly abstrae la interacción mediante APIs REST estándar.

### 1. Verificar el registro
Para comprobar que el contrato se ha desplegado y FireFly ha generado su interfaz (FFI), puedes hacer una petición GET a tu nodo local:
```http
GET http://localhost:5000/api/v1/namespaces/default/apis
```
Esto te devolverá la lista de contratos y la URL directa a su explorador Swagger/OpenAPI autogenerado.

### 2. Invocar funciones (Ejemplo)
Para invocar una transacción (ej. `AnchorTelemetry`), no usamos la terminal, sino que hacemos una petición HTTP POST al endpoint de invocación de FireFly:

```bash
curl -X POST http://localhost:5000/api/v1/namespaces/default/contracts/invoke \
-H "Content-Type: application/json" \
-d '{
  "location": {
    "channel": "firefly",
    "chaincode": "aurora-telemetry-anchor"
  },
  "method": {
    "name": "AnchorTelemetry",
    "params": [
      { "name": "ingestId", "schema": { "type": "string" } },
      { "name": "ecosystemId", "schema": { "type": "string" } },
      { "name": "telemetryHash", "schema": { "type": "string" } },
      { "name": "signature", "schema": { "type": "string" } },
      { "name": "publicKey", "schema": { "type": "string" } }
    ],
    "returns": []
  },
  "input": {
    "ingestId": "test-ingest-001",
    "ecosystemId": "eco-test-1",
    "telemetryHash": "a1b2c3d4e5f6...",
    "signature": "mock-signature",
    "publicKey": "mock-public-key"
  }
}'
```

---

## 🗂️ Lista de Chaincodes Disponibles

| Carpeta / Chaincode | Versión Actual | Descripción |
|---------------------|----------------|-------------|
| `aurora-telemetry-anchor/` | `1.0` | Anclaje de telemetría IoT: persiste el hash firmado, previene duplicados mediante `ingestId` y consolida el no-repudio. |
