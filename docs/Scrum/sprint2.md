# Sprint 2: Desarrollo de la Interfaz de Usuario (Web App)

**Fase PUD:** Construcción (Iteración inicial enfocada en UI/UX)
**Duración:** [Insertar fechas, ej. 2 Semanas]
**Estado:** Planificado

---

## Objetivo del Sprint
Iniciar la fase de Construcción enfocándose en el Portal de Gestión (Web App). El objetivo es desarrollar una interfaz de usuario navegable utilizando datos estáticos (*mockeados*) que permita validar el flujo de trabajo con el Product Owner. Esto permitirá definir los contratos de la API que el backend deberá suministrar en futuros sprints, cumpliendo estrictamente con los Casos de Uso del catálogo oficial.

## Backlog del Sprint (Casos de Uso)

### 1. [CU-05] Autenticar Usuario
* **Dominio:** Subsistema de Gestión de Identidades (IAM) y Ecosistemas.
* **Descripción:** Implementación de la vista de acceso a la Web App mediante credenciales para Propietarios y Auditores.
* **Tareas Técnicas (Frontend):**
  * Inicialización del proyecto cliente (ej. Vite con React/Angular/Vue) y configuración del enrutamiento base (*Router*).
  * Desarrollo del componente visual de Login (formulario de credenciales).
  * Implementación de un servicio de autenticación simulado para probar transiciones de estado.
  * Configuración de *Guards* de ruta para proteger el acceso a las vistas privadas.

### 2. [CU-11] Visualizar Estado del Ecosistema
* **Dominio:** Subsistema de Autorización y Compartición (Web App).
* **Descripción:** Creación de la interfaz principal (*Dashboard*) donde el Propietario consulta sus dispositivos y la telemetría reciente.
* **Tareas Técnicas (Frontend):**
  * Diseño e implementación del *Layout* estructural: menú lateral, cabecera y contenedor de vistas.
  * Diseño de tarjetas de métricas principales (ej. Nodos activos, Alertas).
  * Integración de una librería de gráficos (ej. Chart.js o ECharts).
  * Inyección de un *dataset* estático (*mocks*) que represente dispositivos de una *Smart Home* para poblar los gráficos de forma realista.

### 3. [CU-14] Validar Integridad de Datos
* **Dominio:** Subsistema de Auditoría y Seguridad.
* **Descripción:** Maquetación de la vista que permite comprobar visualmente que el *hash* del dato *off-chain* coincide con la firma inmutable de la blockchain.
* **Tareas Técnicas (Frontend):**
  * Desarrollo de una tabla de datos avanzada para explorar la telemetría.
  * Diseño de indicadores visuales (*badges* o iconos) que diferencien explícitamente el estado criptográfico de un registro (ej. "Pendiente", "Validado en Blockchain").

### 4. [CU-16] Visualizar Logs de Auditoría
* **Dominio:** Subsistema de Auditoría y Seguridad.
* **Descripción:** Creación de la interfaz para que el Auditor revise el registro inmutable de accesos y alertas del sistema.
* **Tareas Técnicas (Frontend):**
  * Reutilización del componente de tabla avanzada adaptado a eventos de seguridad (intentos de login, revocaciones).
  * Inclusión de filtros de búsqueda simulados (por fecha, por tipo de evento, por actor).
  * Inyección de un array estático de logs de seguridad para evaluar la presentación visual con el Product Owner.

## Entregables y Criterios de Aceptación
* Aplicación web desplegable en local para demostraciones.
* El usuario (Propietario/Auditor) puede interactuar con el formulario de login y navegar por el menú.
* Las pantallas de los casos CU-11, CU-14 y CU-16 muestran datos coherentes (*mocks*) que permiten validar la utilidad de la interfaz.