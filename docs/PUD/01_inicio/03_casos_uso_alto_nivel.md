# Catálogo de Casos de Uso

A continuación se detallan los Casos de Uso identificados para el sistema, agrupados por los dominios funcionales de la arquitectura.

## 1. Subsistema de Gestión de Identidades (IAM) y Ecosistemas
*Casos de uso relacionados con el ciclo de vida de los actores, la criptografía y el acceso al sistema.*

* **CU-01: Registrar Administrador/Auditor:** Creación de un perfil con privilegios globales.
* **CU-02: Registrar Usuario Propietario:** Alta de un dueño de un ecosistema (Smart Home).
* **CU-03: Registrar Ecosistema IoT:** Agrupación lógica de dispositivos bajo un mismo propietario.
* **CU-04: Aprovisionar Nodo IoT:** Generación y asignación de material criptográfico (certificados/claves) para un nuevo dispositivo.
* **CU-05: Autenticar Usuario:** Inicio de sesión en la Web App mediante credenciales.
* **CU-06: Autenticar Nodo IoT:** Validación del certificado del dispositivo contra el API Gateway antes de permitir la ingesta.
* **CU-07: Revocar Identidad/Certificado:** Invalidación de las credenciales de un Usuario o Nodo IoT comprometido (iniciado por el Auditor o Propietario).

## 2. Subsistema de Ingesta y Trazabilidad (IoT & Blockchain)
*El núcleo del procesamiento de datos, garantizando el no repudio y el patrón hash-in-chain.*

* **CU-08: Transmitir Telemetría:** El Nodo IoT envía el *payload* firmado digitalmente al API Gateway.
* **CU-09: Almacenar Telemetría Off-Chain:** El sistema persiste los datos en crudo en la base de datos de alta capacidad.
* **CU-10: Anclar Evidencia On-Chain (Hash-in-chain):** El sistema invoca el *Smart Contract* para guardar en Hyperledger el hash criptográfico de la telemetría almacenada.

## 3. Subsistema de Autorización y Compartición (Web App)
*Interacciones del propietario para gestionar la privacidad de sus datos.*

* **CU-11: Visualizar Estado del Ecosistema:** El Propietario consulta sus dispositivos y la telemetría reciente.
* **CU-12: Autorizar Acceso a Terceros:** El Propietario concede permisos de lectura sobre un subconjunto de sus datos a otra entidad.
* **CU-13: Revocar Acceso a Terceros:** Retirada de los permisos de compartición previamente concedidos.

## 4. Subsistema de Auditoría y Seguridad
*Casos de uso orientados a la validación, monitorización y respuesta ante incidentes.*

* **CU-14: Validar Integridad de Datos:** Comprobación manual o automática de que el *hash* del dato *off-chain* coincide con la firma inmutable de la blockchain.
* **CU-15: Consultar Veredicto de Seguridad:** El sistema envía un lote de eventos al Sistema Externo de Análisis para recibir una evaluación de riesgo.
* **CU-16: Visualizar Logs de Auditoría:** El Auditor revisa el registro inmutable de accesos, intentos de conexión fallidos y alertas del sistema.