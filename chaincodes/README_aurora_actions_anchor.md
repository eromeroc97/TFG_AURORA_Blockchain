# Aurora Actions Anchor Chaincode

**Versión:** 1.0  
**Patrón Arquitectónico:** Event Sourcing + Zero Trust  
**Ledger:** Hyperledger Fabric v2.x  

---

## 1. Propósito y Contexto

Aurora Actions Anchor es un chaincode de Go que actúa como el **"Notario Inmutable"** de la plataforma Aurora. Su responsabilidad es anclar en el ledger de Fabric todas las acciones humanas y administrativas que requieren auditoría forense, tales como:

- Delegaciones de ecosistemas
- Aprobaciones de cuentas
- Cambios de rol
- Revocaciones de permisos

### Flujo de Arquitectura

```
┌─────────────────┐      ┌──────────────────────┐      ┌────────────────────────────┐
│  auth-service   │─────▶│  Aurora Actions Anchor │─────▶│  World State (Fabric)       │
│  (firma digital)│      │  (chaincode)          │      │  + Event Bus (FireFly)     │
└─────────────────┘      └──────────────────────┘      └────────────────────────────┘
                                ▲
                                │
                         ┌──────┴──────┐
                         │ audit-service│
                         │ (solo lectura)│
                         └─────────────┘
```

- **auth-service**: Firma digitalmente las intenciones de los usuarios y envía transacciones al chaincode.
- **Aurora Actions Anchor**: Valida, almacena e indexa las acciones.
- **audit-service**: Consume eventos del ledger para verificación forense (stateless).

---

## 2. Modelo de Datos

### 2.1 ActionType (Enum)

| Tipo | Descripción | Permite Auto-Referencia |
|------|-------------|------------------------|
| `SHARE_REQUEST` | Solicitud de delegación | No (raíz) |
| `SHARE_ACCEPT` | Aceptación de delegación | No |
| `SHARE_REJECT` | Rechazo de delegación | No |
| `SHARE_REVOKE` | Revocación por mismo actor | **Sí** |
| `REQUEST_CANCEL` | Cancelación de solicitud | **Sí** |
| `ROLE_CHANGE` | Cambio de rol | No |
| `ACCOUNT_INIT` | Inicialización de cuenta | No (raíz) |
| `ACCOUNT_APPROVE` | Aprobación de cuenta | No |
| `ECOSYSTEM_CREATE` | Creación de ecosistema | No (raíz) |

### 2.2 Estructura AnchoredAction

```json
{
  "action_id": "550e8400-e29b-41d4-a716-446655440000",
  "parent_action_id": "",
  "actor_id": "user-uuid-123",
  "target_id": "ecosystem-uuid-456",
  "action_type": "SHARE_REQUEST",
  "readable_description": "Usuario X delega Ecosistema Z a Usuario Y con Rol AUDITOR",
  "payload_hash": "a1b2c3d4...",
  "signature": "MEUCIQD...",
  "public_key": "-----BEGIN PUBLIC KEY...",
  "timestamp": 1715692800000,
  "nonce": "uuid-nonce-789",
  "metadata": {}
}
```

---

## 3.API del Chaincode

### 3.1 Invoke (Escritura)

#### `anchor`

Ancla una nueva acción en el ledger.

```json
// Input (JSON)
{
  "action_id": "uuid-v4",
  "parent_action_id": "uuid-o-vacio",
  "actor_id": "user-uuid",
  "target_id": "target-uuid",
  "action_type": "SHARE_REQUEST",
  "readable_description": "Texto legible para auditoría",
  "signature": "firma-base64",
  "public_key": "clave-publica-pem",
  "nonce": "uuid-aleatorio"
}

// Output
// ActionID si tiene éxito, o código de error
```

### 3.2 Queries (Lectura)

| Función | Descripción | Argumentos |
|---------|-------------|-----------|
| `getAction` | Recuperar acción por ID | `[ActionID]` |
| `getActionsByActor` | Historial de acciones de un actor | `[ActorID]` |
| `getActionChildren` | Acciones que responden a una padre | `[ParentActionID]` |
| `getActionsByTarget` | Acciones sobre un recurso | `[TargetID]` |
| `getActionsByType` | Filtrar por tipo de acción | `[ActionType]` |
| `verifyActionSignature` | Validación stateless | `[ActionID]` |
| `getActionHistory` | Historial forense | `[ActionID]` |

---

## 4. Estrategia de Indexación

El chaincode utiliza **Composite Keys** para permitir consultas eficientes sin escanear el world state completo.

| Índice | Clave Compuesta | Propósito |
|--------|----------------|-----------|
| `action~{ID}` | Lookup primario | Recuperación directa |
| `actor~{ID}~{ts}~{actionID}` | Historial por actor | Búsqueda cronológica |
| `parent~{parentID}~{ts}~{actionID}` | Hilos de acciones | Trazabilidad |
| `target~{targetID}~{ts}~{actionID}` | Por recurso | Auditoría de recursos |
| `type~{type}~{ts}~{actionID}` | Por tipo | Filtrado |
| `nonce~{nonce}` | Anti-replay | Prevención de duplicados |

---

## 5. Validaciones de Seguridad (Zero Trust)

El chaincode aplica las siguientes validaciones antes de aceitar una acción:

### 5.1 Validaciones de Entrada
- [ ] Todos los campos obligatorios presentes
- [ ] ActionType válido según enum
- [ ] ReadableDescription ≤ 2048 bytes
- [ ] Nonce no vacío

### 5.2 Validaciones Criptográficas
- [ ] PayloadHash = SHA-256( ActionPayload canónico )
- [ ] Firma verificable con la PublicKey del actor (**Ed25519**)
- [ ] Clave pública en formato PEM válido (PKIX/X.509)

### 5.3 Validaciones de Integridad
- [ ] ActionID único (no existente en world state)
- [ ] Nonce no utilizado previamente

### 5.4 Validaciones de Trazabilidad
- [ ] ParentActionID existente (si aplica)
- [ ] Reglas de auto-referencia aplicadas por ActionType
- [ ] Acciones raíz deben ser de tipos permitted

### 5.5 Consenso Temporal
- [ ] Timestamp extraído de `stub.GetTxTimestamp()` (nodo líder)
- [ ] **No se valida** timestamp del cliente (manipulable)

---

## 6. Eventos Fabric

### Evento Emitido: `AuroraActionAnchored`

```json
{
  "eventName": "AuroraActionAnchored",
  "payload": {
    "action_id": "550e8400-e29b-...",
    "action_type": "SHARE_REQUEST",
    "actor_id": "user-uuid-123",
    "target_id": "ecosystem-uuid-456",
    "parent_action_id": "",
    "timestamp": 1715692800000,
    "readable_description": "Usuario X delega...",
    "payload_hash": "a1b2c3d4...",
    "signature": "MEUCIQD...",
    "tx_id": "channel-tx-id",
    "block_number": 12345,
    "nonce": "uuid-nonce",
    "canonical_payload_json": "{\"action_id\":\"...\"}"
  }
}
```

### Integración FireFly

- **Topic:** `aurora_actions`
- **Namespace:** `default`
- **Identificador:** `action_id` como `_id`

---

## 7. Códigos de Error

| Código | Descripción |
|--------|-------------|
| `ERR_MISSING_REQUIRED` | Campo obligatorio ausente |
| `ERR_INVALID_ACTION_TYPE` | Tipo de acción no permitido |
| `ERR_INVALID_SIGNATURE` | Firma criptográfica inválida |
| `ERR_ACTION_ID_COLLISION` | ActionID ya existe |
| `ERR_PARENT_NOT_FOUND` | ParentActionID referenciado no existe |
| `ERR_SELF_REFERENCE_FORBIDDEN` | Auto-respuesta no permitida para este tipo |
| `ERR_INVALID_PUBLIC_KEY` | Formato PEM inválido |
| `ERR_DUPLICATE_NONCE` | Nonce ya utilizado |

---

## 8. Guía de Despliegue

### 8.1 Requisitos

- Go 1.20+
- Hyperledger Fabric 2.x
- Chaincode SDK para Go

### 8.2 Compilación

```bash
cd chaincodes/aurora-actions-anchor
go mod init aurora-actions-anchor
go build -o aurora-actions-anchor .
```

### 8.3 Instalación en Fabric

```bash
# Empaquetar chaincode
peer lifecycle chaincode package aurora-actions-anchor.tar.gz --lang go --path ./aurora-actions-anchor --label aurora-actions-anchor-1.0

# Instalar en peers
peer lifecycle chaincode install aurora-actions-anchor.tar.gz

# Aprobar en organización
peer lifecycle chaincode approveformorg --name aurora-actions-anchor --version 1.0 --sequence 1 --channel-id aurora-channel

# Commit
peer lifecycle chaincode commit --name aurora-actions-anchor --version 1.0 --sequence 1 --channel-id aurora-channel
```

---

## 9. Consideraciones de Seguridad

1. **No repudio:** Toda acción contiene firma digital del actor (Ed25519).
2. **Integridad:** PayloadHash garantiza que los datos no fueron alterados.
3. **Anti-replay:** Nonce único por transacción.
4. **Trazabilidad:** ParentActionID crea grafo de acciones auditable.
5. **Determinismo:** Timestamp del bloque como fuente de tiempo (no del cliente).
6. **Compatibilidad:** Claves PEM compatibles con Node.js/NestJS (formato MCowBQYDK2Vw...)

---

## 10. Criptografía Ed25519

El chaincode utiliza **Ed25519** (RFC 8032) para la verificación de firmas digitales. Este algoritmo fue elegido por:

- **Compatibilidad con Node.js:** Las claves Ed25519 generadas en Node.js/NestJS con formato PEM estándar (cabecera `MCowBQYDK2Vw...`) son directamente compatibles.
- **Seguridad avanzada:** Curves de Edwards de 256 bits, resistente a ataques de sincronización deTiming.
- **Rendimiento:** Firma y verificación más rápida que ECDSA/P-256.

### Formato de Clave Pública Esperada

```pem
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwIyEA...
-----END PUBLIC KEY-----
```

### Proceso de Verificación

```
1. Decodificar Signature de Base64 a bytes
2. Parsear PEM para obtener bytes de clave pública (PKIX)
3. Convertir a tipo ed25519.PublicKey
4. Ejecutar ed25519.Verify(message, signature)
```

---

## 11. Licencia

Este chaincode forma parte del proyecto TFG_AURORA_Blockchain.

---

*Documento generado para revisión y despliegue.*