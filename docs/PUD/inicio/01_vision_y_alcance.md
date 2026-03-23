# Documento de Visión y Alcance

## 1. Propósito del Sistema
El presente trabajo aborda la carencia de trazabilidad segura en los eventos generados dentro de entornos distribuidos e IoT (Internet of Things). El objetivo principal es diseñar e implementar una arquitectura que garantice el no repudio, la integridad y la auditoría en los intercambios de información, utilizando como caso de estudio un ecosistema de *Smart Homes*.

## 2. Alcance del Proyecto
*El sistema implementará las siguientes capacidades core:*

* **Gestión de Identidades y Accesos (IAM):** El sistema administrará el ciclo de vida de las identidades (usuarios humanos y sistemas distribuidos/nodos IoT) dentro del ecosistema.
* **Integración DLT y Smart Contracts:** Interacción con una red blockchain privada y permisionada. Se desarrollará la lógica de negocio en la cadena (*Smart Contracts / Chaincode*) para la gestión de certificados y la validación de transacciones, asegurando el no repudio.
* **API Gateway y Almacenamiento Híbrido Seguro:** Implementación de un punto de entrada seguro para la ingesta de telemetría. Los datos en crudo se almacenarán *off-chain*, implementando un patrón *hash-in-chain* para anclar criptográficamente su integridad en la blockchain.
* **Portal de Gestión (Web App):** Desarrollo de una interfaz de usuario para la administración de sistemas distribuidos, control de acceso, y autorización/revocación de compartición de datos entre entidades.
* **Auditoría de Seguridad:** Integración y consulta automatizada a un sistema externo de análisis de eventos para la monitorización de incidentes.

## 3. Fuera del Alcance
*Para garantizar la viabilidad del proyecto, quedan excluidos los siguientes aspectos:*

* **Despliegue Hardware:** El sistema no gestionará ni monitorizará el estado físico, la instalación o el aprovisionamiento a bajo nivel de los sensores o nodos IoT.
* **Protocolos de Transmisión IoT:** El sistema es agnóstico al método de transporte en el borde (MQTT, CoAP, etc.); no gestionará la emisión de los datos desde el hardware, limitándose a su recepción segura en el backend.
* **Motor de Análisis de Amenazas:** No se desarrollará la lógica algorítmica del módulo de análisis de incidentes, actuando únicamente como cliente de un servicio de terceros.
* **Infraestructura Blockchain en Producción:** La topología de la red blockchain se desplegará en un entorno de pruebas controlado y contenerizado (PoC), no asumiendo el despliegue geográficamente distribuido ni la gobernanza de un consorcio real de múltiples organizaciones.
* **Analítica de Datos (Big Data/BI):** El sistema garantiza la integridad, inmutabilidad y trazabilidad de los datos, pero no incluye procesamiento analítico, predicciones o minería de datos sobre el contenido de la telemetría.

## 4. Restricciones y Suposiciones Técnicas
*El desarrollo y la arquitectura estarán sujetos a las siguientes restricciones:*

* **Contenerización:** Todos los componentes del sistema (microservicios, bases de datos, nodos blockchain) deberán ser desplegables mediante contenedores para garantizar la reproducibilidad del entorno.
* **Arquitectura de Microservicios:** El backend se diseñará de forma desacoplada, separando claramente los dominios de autenticación, gestión IoT e integración blockchain.
* **Tecnologías Open Source:** Se priorizará el uso de herramientas, lenguajes y frameworks de código abierto, alineándose con los estándares de investigación académica.
* **Seguridad por Diseño:** Las comunicaciones internas entre contenedores se realizarán a través de redes privadas aisladas, no exponiendo puertos a internet salvo los estrictamente necesarios.