# Aurora Actions Anchor Chaincode

**Versión:** 2.0
**Patrón Arquitectónico:** Event Sourcing + Zero Trust
**Ledger:** Hyperledger Fabric v2.x

---

## 1. Propósito y Contexto

Aurora Actions Anchor es un chaincode de Go que actúa como el **"Notario Inmutable"** de la plataforma Aurora. Su responsabilidad es anclar en el ledger de Fabric todas las acciones humanas y administrativas que requieren auditoría forense.

### 22 Tipos de Acción Soportados

| Tipo | Descripción |
|------|-------------|
| `ACCOUNT_INIT` | Inicialización de cuenta |
| `ACCOUNT_APPROVE` | Aprobación de cuenta |
| `ACCOUNT_PASSBLOCK` | Cambio de contraseña |
| `ACCOUNT_REVOKE` | Revocación de cuenta |
| `ROLE_CHANGE` | Cambio de rol |
| `ECOSYSTEM_CREATE` | Creación de ecosistema |
| `ECOSYSTEM_UPDATE` | Actualización de ecosistema |
| `ECOSYSTEM_REVOKE` | Revocación de ecosistema |
| `ECOSYSTEM_LEAVE` | Usuario abandona ecosistema |
| `ECOSYSTEM_ACCESS_GRANT` | Acceso concedido a ecosistema |
| `ECOSYSTEM_ACCESS_ACCEPT` | Aceptación de acceso |
| `ECOSYSTEM_ACCESS_REJECT` | Rechazo de acceso |
| `ECOSYSTEM_ACCESS_REVOKE` | Revocación de acceso |
| `ECOSYSTEM_ACCESS_UPDATE` | Actualización de acceso |
| `DEVICE_REGISTER` | Registro de dispositivo |
| `DEVICE_UPDATE` | Actualización de dispositivo |
| `DEVICE_REMOVE` | Eliminación de dispositivo |
| `AUTH_LOGIN` | Inicio de sesión |
| `AUTH_LOGOUT` | Cierre de sesión |
| `AUTH_SESSION_REVOKE` | Revocación de sesión |
| `NOTIFICATION_SENT` | Notificación enviada |
| `NOTIFICATION_READ` | Notificación leída |

### Flujo de Arquitectura

```
┌─────────────────┐      ┌──────────────────────────┐      ┌────────────────────────────┐
│  auth-service   │─────▶│  aurora-actions-anchor   │─────▶│  World State (Fabric)       │
│  (firma Ed25519)│      │  (chaincode, Contract API)│      │  + Event Bus (FireFly)     │
└─────────────────┘      └──────────────────────────┘      └────────────────────────────┘
```

- **auth-service**: Genera firma Ed25519 sobre el payload canónico y envía transacciones REST a FireFly.
- **aurora-actions-anchor**: Valida, almacena e indexa las acciones. **No verifica firmas** (verificación stateless en backend).
- **FireFly**: Recibe eventos `ActionAnchored` para notificaciones downstream.

---

## 2. Modelo de Datos

### Estructura AnchoredAction

```json
{
  "action_id": "550e8400-e29b-41d4-a716-446655440000",
  "actor_id": "user-uuid-123",
  "target_id": "ecosystem-uuid-456",
  "action_type": "ECOSYSTEM_ACCESS_GRANT",
  "parent_action_id": "",
  "readable_description": "Usuario X otorga acceso a Usuario Y en Ecosistema Z",
  "signature": "MEUCIQD...",
  "public_key": "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwIyEA...\n-----END PUBLIC KEY-----\n",
  "nonce": "a1b2c3d4e5f6...",
  "metadata": { "role": "AUDITOR", "ecosystemName": "Mi Ecosistema" },
  "anchor_tx_id": "channel-tx-id",
  "anchored_at": "2026-05-11T19:30:00Z"
}
```

### Metadata por Tipo de Acción

Cada `action_type` puede携带 metadata contextual. Se almacena como JSON string en el campo `metadata` (máx. 4096 caracteres). Ejemplos:

- `ECOSYSTEM_ACCESS_GRANT`: `{ "role": "AUDITOR", "ecosystemName": "Nombre" }`
- `ROLE_CHANGE`: `{ "previousRole": "USER", "newRole": "ADMIN" }`
- `DEVICE_REGISTER`: `{ "deviceName": "iPhone 15", "os": "iOS 17" }`
- `AUTH_LOGIN`: `{ "deviceId": "device-uuid", "ipAddress": "192.168.1.1" }`
- `NOTIFICATION_SENT`: `{ "channel": "EMAIL", "template": "access_grant" }`

---

## 3. API del Chaincode (Contract API)

### 3.1 Invoke (Escritura)

#### `AnchorAction`

Ancla una nueva acción en el ledger. Se invoca via REST (FireFly) con parámetros como **query params** (no JSON body).

**Parámetros:**

| # | Parámetro | Tipo | Descripción |
|---|-----------|------|-------------|
| 1 | `actionID` | string | ID único (UUID v4 generado por auth-service) |
| 2 | `actorID` | string | UUID del actor que ejecuta la acción |
| 3 | `targetID` | string | UUID del recurso objetivo |
| 4 | `actionType` | string | Uno de los 22 tipos definidos |
| 5 | `parentActionID` | string | ID de acción padre (vacío si no aplica) |
| 6 | `readableDescription` | string | Texto legible (máx. 2048 chars) |
| 7 | `signature` | string | Firma Ed25519 en Base64 |
| 8 | `publicKey` | string | Clave pública PEM del actor |
| 9 | `nonce` | string |Nonce único (16 bytes hex) |
| 10 | `anchoredAt` | string | Timestamp RFC3339 del backend (**determinista**) |
| 11 | `metadataJSON` | string | Metadata como JSON string (vacío o `{}` si no aplica) |

**Respuesta:** Evento `ActionAnchored` emitido. Error si hay validación fallida.

### 3.2 Queries (Lectura)

| Función | Descripción | Argumentos |
|---------|-------------|-----------|
| `GetAction` | Recuperar acción por ID | `[actionID]` |
| `GetActionsByActor` | Historial de acciones de un actor | `[actorID]` |
| `GetActionsByActorAndType` | Filtrar por actor y tipo | `[actorID, actionType]` |
| `GetActionsByActorAndTypeAndTarget` | Filtrar por actor, tipo y target | `[actorID, actionType, targetID]` |
| `GetActionsByType` | Filtrar por tipo de acción | `[actionType]` |
| `GetActionsByTarget` | Acciones sobre un recurso | `[targetID]` |
| `GetActionChildren` | Acciones hijo de una padre | `[parentActionID]` |

---

## 4. Estrategia de Indexación

El chaincode utiliza **Composite Keys** para consultas eficientes sin escanear el world state completo.

| Índice | Clave Compuesta | Propósito |
|--------|----------------|-----------|
| `actor~{actorID}~{anchoredAt}~{actionID}` | Historial por actor | Orden cronológico |
| `type~{actionType}~{anchoredAt}~{actionID}` | Por tipo | Filtrado |
| `target~{targetID}~{anchoredAt}~{actionID}` | Por recurso | Auditoría de recursos |
| `parent~{parentActionID}~{anchoredAt}~{actionID}` | Hilos de acciones | Trazabilidad |
| `nonce~{nonce}` | Anti-replay | Prevención de duplicados (valor: `0x00`) |

---

## 5. Validaciones de Seguridad (Zero Trust)

### 5.1 Validaciones de Entrada
- [x] Todos los campos obligatorios presentes (actionID, actorID, targetID, actionType, readableDescription, signature, publicKey, nonce, anchoredAt)
- [x] ActionType válido según lista de 22 tipos
- [x] ReadableDescription ≤ 2048 caracteres
- [x] MetadataJSON ≤ 4096 caracteres
- [x] anchoredAt en formato RFC3339 válido

### 5.2 Validaciones de Integridad
- [x] ActionID único (no existente en world state)
- [x] Nonce no utilizado previamente (índice `nonce~{nonce}`)
- [x] ParentActionID existe si no está vacío

### 5.3 Validaciones de Integridad Criptográfica (auth-service)
- [x] Firma Ed25519 sobre payload canónico (verificado en backend, no en chaincode)
- [x] Clave pública en formato PEM
- [x] Nonce criptográficamente aleatorio (16 bytes)

### 5.4 Determinismo
- [x] `anchoredAt` proporcionado por el backend (RFC3339), **no** generado internamente
- [x] No se usa `time.Now()` ni `stub.GetTxTimestamp()` para el timestamp del registro

---

## 6. Eventos Fabric

### Evento Emitido: `ActionAnchored`

```json
{
  "eventName": "ActionAnchored",
  "payload": {
    "action_id": "550e8400-e29b-...",
    "actor_id": "user-uuid-123",
    "target_id": "ecosystem-uuid-456",
    "action_type": "ECOSYSTEM_ACCESS_GRANT",
    "parent_action_id": "",
    "readable_description": "Usuario X otorga acceso...",
    "signature": "MEUCIQD...",
    "public_key": "-----BEGIN PUBLIC KEY-----...",
    "nonce": "a1b2c3...",
    "metadata": { "role": "AUDITOR" },
    "anchor_tx_id": "channel-tx-id",
    "anchored_at": "2026-05-11T19:30:00Z"
  }
}
```

### Integración FireFly

- **Chaincode name:** `aurora-actions-anchor`
- **Endpoint:** `POST /apis/aurora-actions-anchor/AnchorAction` (Contract API)
- **Namespace:** `default`
- **Evento listening:** `ActionAnchored`

---

## 7. Códigos de Error

| Código | Descripción |
|--------|-------------|
| `actionID es obligatorio` | Campo vacío |
| `actorID es obligatorio` | Campo vacío |
| `targetID es obligatorio` | Campo vacío |
| `actionType es obligatorio` | Campo vacío |
| `readableDescription es obligatorio` | Campo vacío |
| `signature es obligatorio` | Campo vacío |
| `publicKey es obligatorio` | Campo vacío |
| `nonce es obligatorio` | Campo vacío |
| `anchoredAt es obligatorio` | Campo vacío |
| `anchoredAt debe estar en formato RFC3339` | Formato inválido |
| `actionType no valido: {tipo}` | Tipo no en enum |
| `readableDescription excede 2048 caracteres` | Límite superado |
| `metadataJSON excede 4096 caracteres` | Límite superado |
| `metadataJSON no es JSON valido` | JSON malformado |
| `accion duplicada: {actionID}` | ActionID ya existe |
| `nonce duplicado: {nonce}` | Nonce ya usado |
| `accion padre no encontrada: {parentActionID}` | Parent no existe |
| `error al guardar accion` | Fallo en PutState |
| `error al emitir evento` | Fallo en SetEvent |

---

## 8. Guía de Despliegue

### 8.1 Requisitos

- Go 1.21+
- Hyperledger Fabric 2.x
- Chaincode SDK: `fabric-contract-api-go v1.2.1`

### 8.2 Compilación

```bash
cd chaincodes/aurora-actions-anchor
go mod tidy
go build -o aurora-actions-anchor .
```

### 8.3 Instalación en Fabric (preparado para FireFly)

```bash
# Compilar
go mod tidy && go build -o aurora-actions-anchor .

# Empaquetar
peer lifecycle chaincode package aurora-actions-anchor.tar.gz \
  --lang go \
  --path ./aurora-actions-anchor \
  --label aurora-actions-anchor-2.0

# Instalar en peers
peer lifecycle chaincode install aurora-actions-anchor.tar.gz

# Aprobar en organización
peer lifecycle chaincode approveformorg \
  --name aurora-actions-anchor \
  --version 2.0 \
  --sequence 2 \
  --channel-id aurora-channel

# Commit
peer lifecycle chaincode commit \
  --name aurora-actions-anchor \
  --version 2.0 \
  --sequence 2 \
  --channel-id aurora-channel
```

### 8.4 Registro en FireFly

Registrar el chaincode en FireFly como `aurora-actions-anchor` con versión `2.0`.

---

## 9. Consideraciones de Seguridad

1. **No repudio:** Toda acción contiene firma digital Ed25519 del actor (verificada en auth-service).
2. **Integridad:** El payload canónico es firmado antes de enviarse al chaincode.
3. **Anti-replay:** Nonce único por transacción, indexado para detección de duplicados.
4. **Trazabilidad:** ParentActionID crea grafo de acciones auditable.
5. **Determinismo:** Timestamp proporcionado por el backend (RFC3339), no generado internamente — garantiza que todos los nodos Produzcan el mismo resultado.
6. **Separación de responsabilidades:** El chaincode NO verifica firmas (stateless). La verificación criptográfica ocurre en auth-service antes del envío.

---

## 10. Criptografía Ed25519 (verificación en auth-service)

### Payload Canónico (orden alfabético de claves)

```json
{
  "action_id": "uuid",
  "action_type": "ECOSYSTEM_ACCESS_GRANT",
  "actor_id": "user-uuid",
  "nonce": "hex-nonce",
  "target_id": "target-uuid"
}
```

**Nota:** Si `parent_action_id` es no vacío, se añade al payload canónico.

### Proceso de Firma (auth-service)

```
1. Construir payload canónico (JSON, claves ordenadas alfabéticamente)
2. SHA-256 del payload → hash
3. Firma Ed25519 del hash → signature (Base64)
4. Enviar a FireFly con actionID, signature, publicKey, nonce, anchoredAt
```

### Formato de Clave Pública Esperada

```pem
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwIyEA...
-----END PUBLIC KEY-----
```

---

## 11. Licencia

Este chaincode forma parte del proyecto TFG_AURORA_Blockchain.

---

*Documento generado para revisión y despliegue.*