# Modelado de Datos: Identidades y Telemetría

Este documento define la estrategia de persistencia, el esquema relacional definitivo para la gestión de identidades y accesos (IAM), y la estructura preliminar de ingesta de datos para los dispositivos IoT.

## 1. Elección Tecnológica de Persistencia (Políglota)

Siguiendo el principio de segregación de responsabilidades y optimización de rendimiento, el sistema implementa una persistencia híbrida (políglota):

* **Identity Vault (PostgreSQL):** Utilizado por el microservicio `auth`. Almacena entidades fuertemente acopladas (Usuarios, Dispositivos, Roles, Autorizaciones). Se elige un motor SQL relacional por su soporte nativo de transacciones ACID, garantizando que no existan estados intermedios inconsistentes al otorgar o revocar permisos críticos.
* **Telemetría Off-Chain (MongoDB Time Series):** Utilizado por el microservicio `iot-manager`. La telemetría IoT genera un volumen masivo de operaciones de escritura (Append-Only) y lecturas basadas en rangos temporales. Se opta por una base de datos NoSQL orientada a series temporales para maximizar el *throughput* de ingesta, manteniendo el esquema de los *payloads* de los sensores flexible y escalable.

---

## 2. Esquema Definitivo: Identity Vault (Microservicio Auth)

El siguiente modelo Entidad-Relación define la estructura centralizada de identidades. Destaca el uso de `fabric_did` (Identificadores Descentralizados) para vincular las entidades físicas con sus representaciones en la red blockchain (Hyperledger FireFly).

### Diagrama Entidad-Relación (ER)
*(Visualizable compilando el siguiente código PlantUML)*

### Reglas de Negocio Clave
1. **Inmutabilidad de Auditoría:** La tabla `authorizations` no permite borrados físicos (`DELETE`). Las revocaciones se marcan actualizando el campo `status` a `REVOKED` y registrando el *timestamp* en `revoked_at`.
2. **Identidad Criptográfica:** Todo `user` y `device` debe tener un `fabric_did` único generado durante su aprovisionamiento para poder firmar y anclar transacciones mediante el `bc-service`.

---

## 3. Estructura Preliminar: Telemetría IoT (Microservicio IoT-Manager)

Para la ingesta masiva de datos en MongoDB, se define un esquema JSON inicial. Este esquema está dividido en una **cabecera estricta** (necesaria para la seguridad y el enrutamiento) y un **cuerpo flexible** (para acomodar diferentes tipos de sensores).

### Estructura del Payload (Borrador Inicial)

```json
{
  "header": {
    "device_did": "did:firefly:org1:sensor-5f4a",
    "timestamp": "2026-03-25T12:00:00.000Z",
    "event_type": "telemetry_update",
    "signature": "0x4b7a9c2f..." 
  },
  "payload": {
    "temperature_celsius": 22.5,
    "humidity_percent": 45.2,
    "motion_detected": false
  }
}
```

### Justificación de Campos
* **`header.device_did`**: Identifica inequívocamente al emisor en la red DLT. El `iot-manager` valida este campo internamente contra el microservicio `auth` para confirmar que el dispositivo está activo.
* **`header.timestamp`**: Crucial para el almacenamiento en series temporales (MongoDB Time Series) y para mitigar ataques de repetición (*Replay Attacks*).
* **`header.signature`**: La firma criptográfica generada por el nodo IoT en el borde, usando su clave privada. Garantiza el **no repudio**; el `iot-manager` verifica esta firma antes de procesar el `payload`.
* **`payload`**: Objeto de esquema libre. Su contenido variará dependiendo de si el nodo es un sensor de temperatura, una cámara o una cerradura inteligente. Su flexibilidad es la razón principal para utilizar una base de datos NoSQL en esta capa.
