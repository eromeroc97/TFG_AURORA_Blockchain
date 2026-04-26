# [CU-XX] Nombre del Caso de Uso

**Disciplina PUD:** Requisitos / Análisis y Diseño
**Sprint/Iteración:** Sprint X

## 1. Descripción Breve
*Un resumen de 2-3 líneas de lo que intenta conseguir este caso de uso y por qué es importante para el sistema.*

## 2. Actores
* **Actor Principal:** (Ej. Dispositivo IoT, Administrador, Sistema Externo)
* **Actores Secundarios:** (Si interviene algún otro componente o usuario)

## 3. Precondiciones
*Lo que debe ser cierto en el sistema ANTES de que este caso de uso pueda comenzar.*
* *Precondición 1:* * *Precondición 2:*

## 4. Flujo Principal
*El escenario donde todo sale bien. Debe ser una secuencia numerada de interacciones entre el Actor y el Sistema.*
1. El [Actor] envía una petición a...
2. El [Sistema] valida que...
3. El [Sistema] genera...
4. El [Actor] recibe...

## 5. Flujos Alternativos
*Qué pasa si algo falla en los pasos del Flujo Principal.*
* **5.1. [Nombre del error, ej. Credenciales Inválidas]**
    * *Condición:* Si en el paso 2 el Sistema detecta que el token ha expirado.
    * *Acción:* El Sistema devuelve un error HTTP 401 y registra el intento fallido en el log de auditoría. El caso de uso termina.
* **5.2. [Otro posible error]**
    * *Condición:* ...
    * *Acción:* ...

## 6. Postcondiciones
*Lo que debe ser cierto en el sistema DESPUÉS de que el caso de uso haya terminado con éxito.*
* *Postcondición 1:* (Ej. Se ha generado un JWT válido y se ha guardado el log de conexión).

## 7. Requisitos Especiales / Riesgos
*(Opcional) Consideraciones de ciberseguridad, rendimiento o infraestructura (ej. "La comunicación debe ir cifrada por TLS", "Debe responder en menos de 200ms").*