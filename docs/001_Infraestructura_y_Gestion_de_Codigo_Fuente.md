## 1. Infraestructura y Gestión de Código Fuente

### 1.1. Estructura del Repositorio
Se ha optado por una arquitectura de **monorepo** para centralizar la gestión de los diferentes componentes del sistema. Esta decisión facilita la consistencia entre microservicios, la reutilización de tipografías y configuraciones, y simplifica la orquestación de la integración continua.

La estructura jerárquica principal es la siguiente:
* **`/apps`**: Contiene las interfaces de usuario (Dashboard).
* **`/services`**: Aloja los microservicios del sistema (`auth`, `iot-manager`, `ff-broker`).
* **`.github/workflows`**: Definiciones de las pipelines de CI/CD.

### 1.2. Estrategia de Ramas (GitFlow Adaptado)
Para gestionar el ciclo de vida del desarrollo se ha implementado una variante de **GitFlow** adaptada a las necesidades de auditoría de los microservicios. El flujo se organiza mediante ramas de larga duración y ramas efímeras:

* **Ramas de Producción/Estables (`main-*`)**:
    * **`main`**: Código estable y consolidado de todo el ecosistema.
    * **`main-auth`, `main-dashboard`, etc.**: Ramas que actúan como "línea base" estable para cada microservicio independiente, permitiendo el etiquetado de versiones específicas solicitadas por la tutoría.
* **Ramas de Desarrollo/Integración**:
    * **`integration`**: Rama principal de desarrollo donde se integran todas las funcionalidades antes de pasar a `main`.
    * **`dev-[microservicio]`**: Ramas de desarrollo específicas que cuelgan de cada `main-*`.
* **Ramas de Características (`feature/*`)**: Ramas temporales creadas para el desarrollo de funcionalidades específicas, que nacen de sus respectivas ramas de desarrollo o de `integration`.

---

## 2. Calidad de Software y Seguridad (SAST)

### 2.1. Configuración de SonarQube
Como medida de seguridad proactiva y control de calidad, se ha integrado **SonarQube** para realizar un Análisis Estático de Seguridad de Aplicaciones (SAST).
* **Proyecto:** `TFG-eromero`.
* **Servidor:** Alojado en la infraestructura de la universidad (`seralu4.esi.uclm.es`).
* **Alcance:** Análisis de vulnerabilidades, *code smells*, deuda técnica y cobertura de código en todo el monorepo.

---

## 3. Integración Continua (CI)

### 3.1. Pipeline con GitHub Actions
Se ha diseñado una pipeline automatizada mediante **GitHub Actions** que se dispara ante cualquier *push* en las ramas principales. La pipeline incluye lógica de **Path Filtering** (filtrado por rutas) para optimizar los recursos, analizando únicamente el código del microservicio que ha sido modificado según la rama de destino.

### 3.2. Ejecución mediante Self-Hosted Runner
Debido a las restricciones de red perimetrales (Firewall/VPN) del servidor de SonarQube de la universidad, se ha desplegado un **Self-Hosted Runner** en el entorno local de desarrollo. 

Esta configuración permite que la pipeline:
1.  Reciba la instrucción de ejecución desde GitHub.
2.  Ejecute el análisis localmente (con acceso al servidor vía VPN).
3.  Reporte los resultados al servidor de auditoría sin necesidad de exponer este último a la red pública, reforzando la seguridad del entorno de desarrollo.
