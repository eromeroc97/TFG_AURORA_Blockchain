 # Sprint 1: Inicialización e Infraestructura Base

**Fase PUD:** Inicio y Elaboración
**Duración:** [2 semanas, lunes 23 de marzo de 2026 a viernes 10 de abril de 2026 (vacaciones: lunes 30 de marzo a lunes 6 de abril)]  
**Estado:** Completado 

---

## Objetivo del Sprint
El objetivo principal de este primer iteración no fue la entrega de Casos de Uso funcionales, sino la mitigación de los riesgos arquitectónicos. Se estableció el esqueleto del proyecto, garantizando la reproducibilidad del entorno de desarrollo y configurando la infraestructura base para soportar el paradigma *Zero-Trust* y la persistencia políglota definida en la arquitectura del sistema.

## Tareas y Tareas Técnicas (Issues) Completadas

### 1. [Infra-01] Configuración del Repositorio y Entorno de Contenedores
* **Descripción:** Creación de la estructura base del proyecto y definición de los entornos virtualizados para aislar los dominios de fallo.
* **Acciones realizadas:**
  * Inicialización del repositorio (estructura monorepo/multirepo).
  * Creación del archivo `docker-compose.yml` maestro.
  * Definición de redes virtuales aisladas en Docker (`frontend-net`, `backend-net`, `db-net`) para cumplir con el principio de segregación y mínimo privilegio.

### 2. [Infra-02] Despliegue del Perímetro de Seguridad (API Gateway)
* **Descripción:** Implementación del punto de entrada único al ecosistema para gestionar el enrutamiento y sentar las bases de la Confianza Cero.
* **Acciones realizadas:**
  * Integración de la imagen oficial de **Traefik**.
  * Configuración del enrutamiento estático base para interceptar el tráfico entrante.
  * Habilitación del panel de control interno (Dashboard) de Traefik para la monitorización local de rutas y servicios.

### 3. [Infra-03] Inicialización de la Persistencia Políglota
* **Descripción:** Despliegue de los motores de bases de datos que soportarán la lógica de negocio y la ingesta masiva de telemetría *off-chain*.
* **Acciones realizadas:**
  * Despliegue del contenedor de **PostgreSQL** con volúmenes persistentes locales para la futura gestión del subsistema IAM (Gestión de Identidades).
  * Despliegue del contenedor de **MongoDB Time Series** con volúmenes persistentes para el almacenamiento de alta capacidad de eventos IoT.
  * Verificación de conectividad interna entre las bases de datos y la red del backend (`backend-net`).

## Decisiones Arquitectónicas
* Se adoptó un enfoque *Infrastructure as Code* (IaC) básico mediante Docker Compose para garantizar que cualquier miembro del equipo (o tribunal evaluador) pueda levantar el entorno completo con un solo comando.
* Las bases de datos no exponen puertos al exterior (máquina host) de forma directa, siendo accesibles únicamente desde los contenedores que compartan su red específica, reduciendo la superficie de ataque desde el primer día.

## Entregables
* Repositorio inicializado.
* Archivo `docker-compose.yml` funcional y documentado.
* Entorno base levantado y testeado en local (Traefik, PostgreSQL, MongoDB operativos y enrutados).