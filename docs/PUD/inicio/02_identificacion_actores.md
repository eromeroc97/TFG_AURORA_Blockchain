# Catálogo de Actores del Sistema

En el contexto de esta arquitectura orientada a la auditoría y la seguridad (trazabilidad y no repudio), se identifican los siguientes actores que interactuarán con las fronteras del sistema:

## 1. Actores Principales
*(Entidades que inician casos de uso y transacciones directas con el sistema)*

* **Usuario Propietario (Humano):** Representa al dueño legítimo de un ecosistema distribuido (ej. una *Smart Home*). Interactúa con el Portal de Gestión (Web App) para administrar sus dispositivos, visualizar sus identidades criptográficas y autorizar o revocar el acceso de terceros a su telemetría.
* **Administrador / Auditor de Seguridad (Humano):** Perfil técnico con privilegios globales. Se encarga de supervisar el estado general de la red, registrar los ecosistemas base, revisar las alertas de seguridad y ejercer la capacidad de revocar certificados a nivel global ante el compromiso de un nodo.
* **Nodo IoT / Gateway (Sistema Automático):** El componente hardware en el borde de la red. Sus responsabilidades incluyen la autenticación contra el API Gateway, la firma digital de sus envíos (garantizando el no repudio) y la transmisión de *payloads* de telemetría para su ingesta y almacenamiento híbrido seguro.

## 2. Actores Secundarios
*(Entidades que asisten al sistema o a las que el sistema recurre para delegar tareas)*

* **Sistema Externo de Análisis de Eventos (Sistema):** Servicio de terceros (ej. un SIEM o motor heurístico) que recibe consultas automatizadas por parte de nuestra arquitectura. Evalúa si un conjunto de telemetría o un evento de red constituye un incidente de seguridad y devuelve un veredicto de auditoría al sistema principal.