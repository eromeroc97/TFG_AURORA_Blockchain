# Metodología de Desarrollo y Gestión del Proyecto

Este proyecto adopta un enfoque metodológico híbrido que combina la solidez arquitectónica del **Proceso Unificado de Desarrollo (PUD)** con la flexibilidad y el ritmo de entrega de **Scrum**. Esta combinación garantiza el rigor técnico exigido en el diseño de herramientas de ciberseguridad y la agilidad necesaria para iterar sobre los microservicios.

## 1. El Motor de Desarrollo: Proceso Unificado (PUD)

El ciclo de vida del software se rige estrictamente por los principios del PUD:

* **Dirigido por Casos de Uso:** Los requisitos no se formulan como historias de usuario aisladas, sino como Casos de Uso formales que describen la interacción exacta entre los actores (dispositivos IoT, administradores, plataformas externas) y el sistema. Estos Casos de Uso guían el análisis, el diseño, la implementación y las pruebas.
* **Centrado en la Arquitectura:** Las primeras iteraciones priorizan la validación de la arquitectura base (comunicación entre microservicios, seguridad perimetral, CI/CD) antes de desarrollar funcionalidades secundarias.
* **Enfocado en el Riesgo:** Los riesgos técnicos (ej. viabilidad de la integración continua, autenticación cruzada) dictan la prioridad del Backlog.

## 2. El Motor de Gestión: Scrum

Para la planificación temporal y la gestión del esfuerzo, el PUD se ejecuta mediante el marco de trabajo Scrum:

* **Iteraciones (Sprints):** Ciclos de trabajo fijos de 2 semanas de duración.
* **Sprint 1 (Fase de Inicio):** Comienza el 23/03/2026. Su objetivo principal es la definición del alcance (Visión), la identificación de Casos de Uso críticos y la inicialización de la arquitectura base ejecutando los primeros análisis estáticos de seguridad.
* **Adaptación al Calendario:** La capacidad (velocidad) de cada Sprint se ajusta de forma dinámica según los periodos no lectivos o festivos del entorno académico e investigador.

## 3. Criterios de Aceptación (Definition of Done)

Para que la realización de un Caso de Uso se considere finalizada dentro de un Sprint, debe cumplir los siguientes requisitos arquitectónicos:
1.  El código compila y se despliega correctamente en su contenedor Docker aislado.
2.  El código supera el *Quality Gate* automatizado en SonarQube (cero vulnerabilidades críticas).
3.  Los cambios respetan el modelo de ramas establecido (GitFlow adaptado al monorepo).