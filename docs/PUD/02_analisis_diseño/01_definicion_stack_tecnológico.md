## Justificación del Stack Tecnológico

El diseño de la arquitectura se basa en el principio de mínimo privilegio y en la segregación de responsabilidades. A continuación, se justifican las tecnologías seleccionadas para la capa de exposición y la bóveda de identidades (*Identity Vault*).

### 1. Capa de Exposición y Enrutamiento (API Gateway)
Para proteger la frontera de la red interna y centralizar el tráfico de entrada, se ha seleccionado **Traefik** como proxy inverso y API Gateway.

* **Descubrimiento Dinámico y Escalabilidad:** A diferencia de servidores web estáticos, Traefik es nativo para entornos contenerizados. Se integra directamente con el motor de Docker, permitiendo enrutar tráfico y balancear la carga automáticamente (Round-Robin) si los microservicios subyacentes (como los de ingesta IoT) se replican horizontalmente ante picos de carga.
* **Seguridad perimetral (TLS Termination):** Traefik centraliza la gestión de certificados SSL/TLS, asegurando que todo el tráfico externo viaja cifrado. El tráfico interno (*Este-Oeste*) permanece aislado en una red virtual privada, reduciendo drásticamente la superficie de ataque.

### 2. Microservicio `auth` (Identity Vault e IAM)
Este componente actúa como la bóveda de identidades del sistema, mapeando entidades físicas (Usuarios y Nodos IoT) con sus correspondientes Identidades Descentralizadas (DIDs) en la infraestructura blockchain.

* **Entorno y Framework (Node.js + TypeScript + NestJS):** Se opta por TypeScript para garantizar un tipado estricto, mitigando vulnerabilidades asociadas a la manipulación dinámica de *payloads* en tiempo de ejecución. El uso del framework NestJS impone una arquitectura limpia basada en Inyección de Dependencias (DI) y modularidad, facilitando el mantenimiento y la validación estructural del código.
* **Persistencia Relacional (PostgreSQL + Prisma ORM):** La gestión de roles, permisos y la custodia de los DIDs exige el cumplimiento estricto de transacciones ACID, para lo cual PostgreSQL es el estándar de la industria. Se integra mediante **Prisma ORM**, que genera un cliente de base de datos fuertemente tipado, eliminando el riesgo de vulnerabilidades por inyección SQL (`SQLi`).
* **Suite Criptográfica Orientada a Zero-Trust:** * Para la protección de credenciales en reposo, se emplea el algoritmo de derivación de claves **Argon2**, diseñado específicamente para resistir ataques de fuerza bruta y craqueo mediante hardware dedicado (GPU/ASIC).
    * Para la delegación de autorización interna, se utiliza la especificación **JOSE** (*JSON Object Signing and Encryption*). El microservicio emite tokens firmados asimétricamente que el componente `bc-service` validará bajo políticas Zero-Trust antes de permitir cualquier interacción con la red DLT.

### 3. Microservicio `bc-service` (Proxy Zero-Trust y Pasarela DLT)
Este componente es el único autorizado para interactuar con la infraestructura blockchain (mediante Hyperledger FireFly). Su diseño se basa estrictamente en la arquitectura Zero-Trust (Confianza Cero), asumiendo que la red interna es hostil.

* **Entorno y Framework (Node.js + TypeScript):** Se unifica el stack tecnológico con el servicio de identidades (`auth`) utilizando Node.js. Esta decisión minimiza la complejidad del monorepo, facilita la manipulación nativa de estructuras JSON y permite compartir librerías criptográficas para la generación y validación de tokens.
* **Mecanismos de Seguridad Zero-Trust:**
  * **Verificación Explícita Continua:** El servicio rechaza cualquier petición HTTP plana. Toda solicitud proveniente de `auth` o `iot-manager` debe adjuntar un token JWT interno firmado que acredite la identidad descentralizada (DID) del solicitante.
  * **Control de Acceso Basado en Roles (RBAC):** Actúa como un *Policy Enforcement Point* (PEP). Antes de invocar la API de FireFly, el servicio extrae y valida el rol del token criptográfico (ej. `ROLE_DEVICE`, `ROLE_ADMIN`). Se garantiza así que cada entidad solo pueda ejecutar las transacciones en la cadena para las que ha sido explícitamente autorizada, reduciendo la superficie de ataque y la complejidad computacional.
  * **Conexión Cifrada Bidireccional (mTLS):** El canal de comunicación final entre el `bc-service` y Hyperledger FireFly se establece mediante Autenticación TLS Mutua, garantizando que el orquestador blockchain descarte peticiones de cualquier otro origen.

### 4. Microservicio `iot-manager` (Servicio de Ingesta y Telemetría)
Este componente es el motor de alto rendimiento encargado de recibir, validar y procesar masivamente la telemetría enviada por los nodos IoT, actuando como puente hacia el almacenamiento *off-chain* y la pasarela DLT.

* **Entorno y Framework (Node.js + TypeScript + Fastify):** Se unifica el ecosistema con el resto del backend utilizando Node.js. Su modelo I/O asíncrono y no bloqueante es ideal para manejar miles de conexiones concurrentes típicas de entornos IoT. Se selecciona **Fastify** como micro-framework por su altísimo rendimiento en enrutamiento y, críticamente, por su motor de validación de esquemas JSON nativo basado en la especificación *JSON Schema*.
* **Seguridad y Validación de Entrada:** El servicio aplica una política de validación estricta (Schema Validation) en el mismo borde del framework. Cualquier *payload* de telemetría malformado, con campos inesperados o que exceda los límites de tamaño, es rechazado inmediatamente (HTTP 400) sin llegar a procesarse, mitigando ataques de denegación de servicio (DoS) a nivel de aplicación e inyecciones de código.
* **Integración Zero-Trust:** Para el anclaje de evidencias en la blockchain (*hash-in-chain*), el `iot-manager` no interactúa con la DLT. Genera un *hash* criptográfico de la telemetría validada, emite un token JWT interno firmado (reutilizando las librerías compartidas del monorepo) y delega la ejecución al `bc-service`.
* **Persistencia Off-Chain:** Los datos en crudo se almacenarán en una base de datos optimizada para series temporales (TimescaleDB o MongoDB Time Series), garantizando lecturas y escrituras eficientes para grandes volúmenes de eventos ordenados cronológicamente.

### 5. Aplicación Cliente (Portal de Gestión Web)
Este componente proporciona la interfaz gráfica de usuario (GUI) para que los actores humanos (Propietarios y Auditores) interactúen con el sistema, gestionen sus ecosistemas IoT y administren las políticas de acceso a los datos.

* **Framework y Lenguaje (React/Next.js + TypeScript):** Se opta por React (mediante el framework Next.js) y TypeScript. Esta decisión permite compartir interfaces y tipos de datos directamente con los microservicios del backend dentro del monorepo, garantizando consistencia contractual en las comunicaciones API. 
* **Gestión de Sesiones Seguras:** La aplicación web no almacena estado sensible de forma permanente. La autenticación se delega al microservicio `auth`, el cual emite tokens JWT seguros (con atributos `HttpOnly` y `Secure` en las cookies para prevenir ataques XSS). 
* **Despliegue Contenerizado:** El frontend se compila y despliega como un servicio más dentro de la red Docker. El API Gateway (Traefik) intercepta el tráfico HTTP/HTTPS dirigido a las rutas del cliente (ej. `/` o `/dashboard`) y lo enruta hacia este contenedor, manteniendo el mismo nivel de aislamiento que el resto de microservicios.

## 6. Resumen del Flujo de Funcionamiento (Arquitectura Zero-Trust)

Para comprender la interacción entre los componentes tecnológicos descritos, el siguiente flujo ilustra el procesamiento de un evento crítico (ej. Ingesta de Telemetría IoT):

1. **Recepción Segura (Traefik):** El Nodo IoT transmite su telemetría (firmada digitalmente) hacia el API Gateway mediante HTTPS. Traefik termina la conexión TLS y enruta la petición al microservicio `iot-manager`.
2. **Validación Perimetral (`iot-manager`):** El servicio Node.js recibe el JSON. Utilizando Fastify, valida instantáneamente la estructura del *payload* contra un esquema predefinido. Si es inválido, se rechaza.
3. **Persistencia de Alta Velocidad (Base de Datos NoSQL):** Si el formato es correcto, el dato en crudo (en texto plano) se almacena en la base de datos de series temporales *off-chain* para priorizar el rendimiento de escritura y lectura masiva.
4. **Cálculo de Evidencia Criptográfica:** El `iot-manager` calcula el *hash* (ej. SHA-256) del *payload* original y emite una petición interna adjuntando un token JWT (que contiene la identidad/rol del sensor) hacia el proxy de la blockchain.
5. **Aplicación de Políticas (`bc-service`):** El proxy Zero-Trust recibe la petición. Verifica la firma del JWT interno y comprueba (vía RBAC) que el sensor tiene permisos para ejecutar el *Smart Contract* de registro de evidencias.
6. **Anclaje Inmutable (FireFly & Fabric):** Tras superar la validación, el `bc-service` establece una conexión mTLS con Hyperledger FireFly. FireFly orquesta la transacción en la red DLT, guardando el *hash* del dato en la blockchain (patrón *hash-in-chain*), garantizando así el no repudio y la integridad matemática a largo plazo del evento almacenado *off-chain*.