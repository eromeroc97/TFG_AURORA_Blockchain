# AURORA Smart Home - Requisitos del Sistema

---

## Requisitos Funcionales

### Épica 1: Gestión de Identidad y Autenticación

**Descripción:** El sistema debe permitir el registro, inicio de sesión, cierre de sesión y recuperación de credenciales de los usuarios. Debe validar la seguridad de las contraseñas contra bases de datos de brechas conocidas y proveer a cada identidad los mecanismos criptográficos necesarios para operar en la plataforma. Los usuarios podrán consultar su propio perfil.

| ID | Nombre | Descripción | Actor(es) | Prioridad |
|----|--------|-------------|-----------|-----------|
| RF-01 | Registro de usuario | El sistema permitirá a un visitante registrarse proporcionando email y contraseña. El sistema validará que la contraseña no esté presente en bases de datos de credenciales comprometidas. | Usuario no registrado | Alta |
| RF-02 | Inicio y cierre de sesión | El sistema permitirá a los usuarios autenticarse para acceder a la plataforma y cerrar su sesión de forma segura. | Usuario, Auditor, Administrador | Alta |
| RF-03 | Recuperación de contraseña | El sistema proveerá un mecanismo seguro mediante un enlace de un solo uso enviado al correo electrónico para restaurar el acceso. | Usuario, Auditor, Administrador | Media |
| RF-04 | Consulta de perfil | El sistema permitirá al usuario autenticado consultar su información personal y estado de cuenta. | Usuario, Auditor, Administrador | Media |

### Épica 2: Administración de Usuarios y Roles

**Descripción:** El sistema debe soportar un modelo de control de acceso basado en roles (Usuario, Auditor, Administrador, Administrador Global). Los administradores deben disponer de herramientas para gestionar el ciclo de vida de las cuentas de usuario, incluyendo la aprobación de nuevos registros, la modificación de roles y la revocación de accesos.

| ID | Nombre | Descripción | Actor(es) | Prioridad |
|----|--------|-------------|-----------|-----------|
| RF-05 | Aprobación de registros | El sistema permitirá a los administradores revisar y aprobar a los nuevos usuarios que se encuentren en estado pendiente. | Administrador | Alta |
| RF-06 | Revocación de cuentas | El sistema permitirá a los administradores bloquear el acceso a usuarios específicos, impidiendo su inicio de sesión sin eliminar su historial. | Administrador | Media |
| RF-07 | Gestión de roles | El sistema permitirá a los administradores asignar diferentes niveles de privilegio (Usuario, Auditor, Administrador) a las cuentas registradas. El rol de Administrador Global es único y se asigna automáticamente al instanciar el sistema; nadie puede asignarlo ni modificarlo. | Administrador | Alta |

### Épica 3: Gestión de Ecosistemas IoT

**Descripción:** El sistema debe permitir crear, editar, ubicar geográficamente y eliminar ecosistemas IoT. El propietario de un ecosistema podrá delegar accesos (con permisos de lectura o gestión) a otros usuarios. El sistema supervisará el estado de conexión de cada ecosistema y generará las credenciales necesarias para su operación segura.

| ID | Nombre | Descripción | Actor(es) | Prioridad |
|----|--------|-------------|-----------|-----------|
| RF-08 | Creación y edición de ecosistemas | El sistema permitirá a los usuarios registrar nuevos entornos IoT, definiendo su nombre y ubicación geográfica. | Usuario, Administrador | Alta |
| RF-09 | Generación de credenciales de ecosistema | El sistema generará automáticamente las claves de acceso necesarias para que un ecosistema se comunique de forma segura con la plataforma. | Sistema | Alta |
| RF-10 | Delegación de accesos | El sistema permitirá al propietario de un ecosistema invitar a otros usuarios, otorgándoles permisos de solo lectura o de gestión. El administrador del sistema tendrá siempre acceso de lectura a todos los ecosistemas. | Usuario, Administrador | Media |
| RF-11 | Gestión de invitaciones | El sistema permitirá a los usuarios invitados aceptar o rechazar el acceso a un ecosistema de terceros. | Usuario | Media |
| RF-12 | Monitorización de estado | El sistema registrará y mostrará el estado de conexión actual de cada ecosistema. | Sistema | Media |

### Épica 4: Gestión de Dispositivos

**Descripción:** El sistema debe ser capaz de identificar y registrar automáticamente nuevos dispositivos IoT a medida que interactúan con los ecosistemas. Los usuarios podrán catalogar, renombrar, ubicar por habitaciones y buscar estos dispositivos dentro de sus ecosistemas asignados, así como consultar su estado y última actividad.

| ID | Nombre | Descripción | Actor(es) | Prioridad |
|----|--------|-------------|-----------|-----------|
| RF-13 | Descubrimiento automático | El sistema registrará automáticamente nuevos dispositivos en un ecosistema cuando detecte actividad de orígenes no catalogados previamente. | Sistema | Alta |
| RF-14 | Edición de información de dispositivos | El sistema permitirá a los usuarios clasificar sus dispositivos por categorías, asignarles nombres personalizados y ubicarlos por habitaciones. | Usuario, Administrador | Media |
| RF-15 | Búsqueda y filtrado de dispositivos | El sistema proveerá un buscador para localizar dispositivos por nombre, categoría, fabricante o identificador de red. | Usuario, Administrador | Media |

### Épica 5: Telemetría y Métricas

**Descripción:** El sistema debe procesar la telemetría enviada por los ecosistemas IoT, garantizando el origen y la autenticidad de los datos. Proporcionará herramientas para consultar estos datos mediante filtros avanzados y presentará métricas agregadas a los usuarios autorizados.

| ID | Nombre | Descripción | Actor(es) | Prioridad |
|----|--------|-------------|-----------|-----------|
| RF-16 | Recepción de telemetría | El sistema admitirá la entrada de datos provenientes de los dispositivos IoT, validando la autorización del ecosistema emisor. | Dispositivo IoT | Alta |
| RF-17 | Consulta avanzada de telemetría | El sistema permitirá a usuarios y auditores filtrar el histórico de datos mediante rangos de fechas, ecosistemas y estado de anclaje. | Usuario, Auditor | Media |
| RF-18 | Visualización de métricas | El sistema generará resúmenes mostrando volúmenes de eventos y actividad reciente. | Usuario, Auditor, Administrador | Media |

### Épica 6: Auditoría y Trazabilidad (Blockchain)

**Descripción:** El sistema debe registrar todas las acciones administrativas críticas y la telemetría en una red blockchain para asegurar una pista de auditoría inmutable. Proveerá un panel específico para el rol de Auditor que permita explorar la línea temporal de eventos y validar que la información no ha sido alterada. Los administradores globales podrán monitorizar la red subyacente y gestionar los contratos inteligentes.

| ID | Nombre | Descripción | Actor(es) | Prioridad |
|----|--------|-------------|-----------|-----------|
| RF-19 | Anclaje inmutable de acciones | El sistema registrará automáticamente cualquier acción administrativa crítica y los eventos de telemetría en un registro inmutable. | Sistema, Administrador | Alta |
| RF-20 | Verificación de integridad | El sistema permitirá a los auditores comprobar que los datos almacenados no han sido alterados desde su registro original. | Auditor, Administrador | Alta |
| RF-21 | Línea temporal de auditoría | El sistema proporcionará a los auditores un visor cronológico de todos los eventos anclados, con capacidades de filtrado y búsqueda. | Auditor | Media |
| RF-22 | Monitorización de red de confianza | El sistema permitirá a los administradores globales visualizar el estado de los nodos, organizaciones y bloques que componen la red subyacente. | GLOBAL_ADMIN | Media |
| RF-23 | Gestión de contratos de negocio | El sistema permitirá a la administración global registrar o dar de baja las reglas lógicas que rigen el registro inmutable. | GLOBAL_ADMIN | Baja |

### Épica 7: Comunicaciones y Notificaciones

**Descripción:** El sistema debe alertar a los usuarios sobre eventos relevantes (invitaciones a ecosistemas, cambios de estado de cuenta, acciones administrativas) mediante un panel de notificaciones interno y a través de correos electrónicos transaccionales. Permitirá a los usuarios interactuar con estas notificaciones cuando requieran una acción y a los administradores enviar comunicados dirigidos.

| ID | Nombre | Descripción | Actor(es) | Prioridad |
|----|--------|-------------|-----------|-----------|
| RF-24 | Notificaciones automáticas | El sistema generará avisos internos para los usuarios ante eventos clave (cambios de rol, invitaciones, aprobaciones de cuenta). | Usuario, Auditor, Sistema | Media |
| RF-25 | Comunicados administrativos | El sistema permitirá a los administradores enviar notificaciones manuales a usuarios específicos o grupos de usuarios según su rol. | Administrador, GLOBAL_ADMIN | Baja |
| RF-26 | Envío de correos transaccionales | El sistema enviará correos electrónicos automáticos para acompañar acciones críticas como bienvenidas, recuperaciones o alertas de seguridad. | Sistema | Media |

---## Requisitos No Funcionales

### Seguridad

| ID | Nombre | Descripción | Actor(es) | Prioridad | Criterios de Aceptación | Dependencias |
|----|--------|-------------|-----------|-----------|------------------------|--------------|
| RNF-001 | Hash de contraseñas | Todas las contraseñas de usuario deben almacenarse utilizando un algoritmo de hash robusto con parámetros de coste adecuados. | — | Alta | Verificar que el hash se genera con los parámetros de coste configurados. Tests unitarios confirman que el hash incluye salt y que la verificación funciona correctamente. Los parámetros siguen las recomendaciones vigentes. | RF-01 |
| RNF-002 | Autenticación mediante tokens | El sistema debe usar tokens firmados asimétricamente para la autenticación de usuarios. El token de acceso tendrá una validez corta. El token de refresco se almacenará de forma segura y podrá rotarse. | — | Alta | Access token firmado con clave privada, verificado con clave pública. Token contiene los claims estándar de identidad y rol. Refresh token almacenado en cookie segura. Al hacer refresh, el token anterior se invalida. Tests de verificación de firma, expiración y rotación. | RF-02 |
| RNF-003 | API Key segura para dispositivos IoT | Las API Keys para dispositivos IoT deben generarse con suficiente entropía y con formato identificable. La API Key se cifra antes de almacenarse. | — | Alta | Verificar que la generación produce claves con entropía suficiente y que el cifrado y descifrado usan un esquema seguro con IV único y tag de autenticación. Tests de generación, cifrado y descifrado. | RF-08 |
| RNF-004 | Cifrado de claves privadas | Las claves privadas generadas para cada ecosistema deben almacenarse cifradas. La clave de cifrado se obtiene de una variable de entorno. | — | Alta | Verificar en tests que: (1) la clave privada almacenada está cifrada y no en texto plano, (2) el descifrado produce la clave original, (3) sin la clave de cifrado correcta no se puede descifrar. | RF-09 |
| RNF-005 | Protección contra contraseñas comprometidas | Durante el registro y cambio de contraseña, el sistema debe consultar un servicio externo de credenciales comprometidas usando un modelo de privacidad diferencial para detectar si la contraseña ha sido expuesta. | — | Media | Implementar el modelo de privacidad: enviar solo un prefijo del hash de la contraseña a la API externa. Si la contraseña aparece en las respuestas, rechazar con error. Tests unitarios con simulación del servicio externo. | RF-01, RF-03 |
| RNF-006 | Token de acceso en memoria | El token de acceso debe almacenarse únicamente en memoria volátil, no en almacenamiento persistente del navegador, para mitigar el riesgo de robo mediante XSS. | — | Alta | Verificar que el token se guarda en una variable en memoria. El refresh token se almacena en cookie httpOnly. Tests de integración verifican que el token no persiste tras recargar página y se renueva con el refresh token. | RF-02 |
| RNF-009 | Inmutabilidad de telemetría mediante blockchain | Una vez anclada en la blockchain, la telemetría no puede ser modificada ni eliminada. El hash del payload y la firma digital garantizan la integridad y autenticidad de los datos. | — | Alta | Verificar end-to-end: (1) calcular hash del payload, (2) firmar con clave privada del ecosistema, (3) invocar el anclaje en la red, (4) consultar el anchor y verificar que el hash coincide, (5) verificar la firma con la clave pública. Tests de integración de todo el flujo. | RF-16 |
| RNF-010 | Trazabilidad de acciones administrativas | Todas las acciones administrativas deben registrarse en la blockchain con metadatos completos: actor, target, tipo, descripción legible, firma y nonce para prevenir repetición. | — | Alta | Verificar que cada acción administrativa invoca el registro inmutable con todos los campos requeridos. Los índices permiten consultas por actor, tipo y target. El nonce previene duplicados. Tests de consulta por cada criterio. | RF-19 |
| RNF-015 | API Gateway | Todo el tráfico externo debe pasar por un punto único de entrada que enruta las peticiones a los servicios internos según el prefijo de ruta. | — | Alta | API Gateway configurado con puntos de entrada para web, secure y administración. Enrutamiento por prefijo de ruta. Solo los servicios destinados al exterior son accesibles desde fuera. | RNF-014 |
| RNF-018 | Control de acceso basado en roles (RBAC) | El sistema debe implementar RBAC con cuatro roles: USER, AUDITOR, ADMIN, GLOBAL_ADMIN. Cada endpoint debe validar que el usuario autenticado tenga el rol adecuado. | — | Alta | Implementar mecanismos de verificación de roles en cada endpoint. La aplicación web incluye componentes de protección por rol. Tests de autorización para cada endpoint cubren todos los roles, incluyendo denegación. | RF-02, RF-07 |
| RNF-020 | Validación de esquemas en APIs | Todas las peticiones HTTP entrantes deben validarse contra esquemas definidos, rechazando propiedades no permitidas y verificando tipos y campos requeridos. | — | Alta | Verificar que: (1) propiedades no definidas en el esquema son eliminadas, (2) tipos incorrectos son rechazados, (3) campos requeridos faltantes son rechazados, (4) payloads maliciosos son rechazados. Tests de validación para cada endpoint. | — |
| RNF-021 | Integridad mediante hash de telemetría | Cada payload de telemetría debe tener un hash calculado a partir del payload normalizado más las coordenadas GPS. Este hash se almacena y se ancla en la blockchain. | — | Alta | Verificar que: (1) el hash se calcula con el mismo algoritmo siempre, (2) el hash almacenado coincide con el anclado en blockchain, (3) cualquier modificación del payload produce un hash diferente. Tests de integridad. | RF-16 |
| RNF-022 | Firma digital de telemetría | Cada hash de telemetría debe firmarse digitalmente con la clave privada del ecosistema antes de anclarse en la blockchain. La firma y la clave pública se almacenan junto con el anchor. | — | Alta | El servicio de identidad expone un endpoint interno para firmar hashes. El gestor de IoT lo invoca durante la ingesta. La firma se verifica con la clave pública almacenada en el anchor. Tests de firma y verificación. | RF-16 |
| RNF-024 | Cumplimiento OWASP Top 10 | El sistema debe cumplir con las medidas de mitigación para los riesgos identificados en el OWASP Top 10 y OWASP API Security Top 10. | — | Alta | Revisión de seguridad documentada que mapea cada riesgo OWASP con la mitigación implementada. Escaneo SAST sin vulnerabilidades críticas o altas. Tests de seguridad específicos para los riesgos identificados. | RNF-001, RNF-002, RNF-006, RNF-018, RNF-020 |
| RNF-025 | Autenticación entre servicios | Las comunicaciones entre microservicios deben autenticarse mediante un token compartido configurado en variables de entorno. | — | Alta | Cada servicio valida el token de autenticación en todos los endpoints internos. Sin token o token incorrecto se rechaza la petición. Tests de autorización de endpoints internos. | RNF-016 |
| RNF-026 | Prevención de ataques de replay | El sistema de anclaje debe prevenir ataques de replay mediante un nonce único incluido en cada acción. El sistema almacena los nonces usados y rechaza duplicados. | — | Alta | Verificar que: (1) cada acción incluye un nonce único, (2) los nonces usados se almacenan para detección, (3) si se recibe un nonce repetido, la transacción es rechazada, (4) el nonce se genera con entropía suficiente. | RF-19 |
| RNF-027 | Rotación de refresh tokens | Cada vez que se usa un refresh token para obtener un nuevo access token, el refresh token anterior debe invalidarse y emitirse uno nuevo. Esto limita la ventana de exposición si un refresh token es robado. | — | Alta | Verificar que: (1) la renovación invalida el token anterior, (2) emite un nuevo refresh token en cookie segura, (3) el token anterior no puede reutilizarse, (4) el hash del refresh token se actualiza en base de datos. Tests de rotación y reuso. | RF-02, RNF-002 |
| RNF-028 | Bloqueo de cuenta por inactividad | Si un usuario no cambia su contraseña después de un período configurable, su cuenta pasa a estado bloqueado. El usuario debe usar la recuperación de contraseña para desbloquearla. | — | Media | Al hacer inicio de sesión, si la fecha del último cambio de contraseña supera el umbral configurado, se deniega el acceso y se actualiza el estado de la cuenta. El flujo de reseteo de contraseña cambia el estado a activo. Tests de bloqueo y desbloqueo. | RF-01, RF-03 |
| RNF-029 | Revocación silenciosa de cuentas | Cuando un usuario es revocado, el sistema debe responder de forma idéntica a cuando el usuario no existe, para evitar enumeración de cuentas válidas. El email se ofusca en la base de datos. | — | Media | Verificar que: (1) al intentar inicio de sesión con usuario revocado, la respuesta es idéntica a "usuario no encontrado", (2) el email en base de datos se reemplaza por un valor ofuscado, (3) las listas de usuarios excluyen revocados por defecto. Tests de seguridad de enumeración. | RF-06 |
| RNF-032 | Proxy seguro de Docker | El API Gateway no debe acceder directamente al socket de Docker. Debe usar un proxy que exponga solo los endpoints necesarios y filtre el resto por seguridad. | — | Alta | Verificar que: (1) el proxy de Docker Socket está configurado, (2) el API Gateway se conecta a través del proxy, (3) solo los contenedores con exposición explícita son accesibles. Tests de configuración. | RNF-014, RNF-015 |
| RNF-039 | Validación segura de tokens de reseteo | Los tokens de reseteo de contraseña deben almacenarse como hash, no en texto plano. El consumo del token debe ser atómico para evitar doble uso. | — | Alta | Verificar que: (1) el token se almacena como hash, (2) el identificador del token tiene restricción de unicidad, (3) el consumo se hace en una operación atómica que marca el token como usado, (4) un token usado no puede reutilizarse. Tests de seguridad. | RF-03 |

### Rendimiento

| ID | Nombre | Descripción | Actor(es) | Prioridad | Criterios de Aceptación | Dependencias |
|----|--------|-------------|-----------|-----------|------------------------|--------------|
| RNF-007 | Cache de API Keys | La validación de API Keys de IoT debe usar un sistema de caché: TTL positivo para keys válidas, TTL negativo para keys inválidas. Debe existir un mecanismo de fallback si la caché no está disponible. | — | Alta | Verificar en tests de integración: (1) primera consulta: fallo en caché → consulta a servicio de identidad → pobla caché, (2) segunda consulta: acierto en caché, (3) key inválida se cachea por tiempo breve, (4) si la caché falla, se usa el servicio de identidad como fallback. | RF-16 |
| RNF-008 | Almacenamiento de series temporales | La telemetría IoT debe almacenarse en una colección optimizada para series temporales, con campo de timestamp, metadatos y granularidad definida. | — | Alta | Verificar que la colección se crea con la configuración de series temporales correcta. La ingesta inserta documentos con timestamp, metadatos y payload. La compresión está habilitada. Tests de inserción y consulta. | RF-16 |
| RNF-011 | Tiempo de respuesta de APIs | Las APIs REST deben responder en menos de 500ms (percentil 95) bajo carga normal, excepto las operaciones que involucran escritura en blockchain. | — | Alta | Pruebas de carga con al menos 100 peticiones concurrentes durante 1 minuto. P95 de respuesta menor a 500ms para operaciones CRUD. Operaciones de blockchain pueden tener latencia mayor pero deben responder en menos de 5 segundos. | RNF-007 |
| RNF-040 | Cache de resolución de vendor | La resolución de vendor mediante API externa debe cachearse para evitar llamadas repetidas por la misma dirección de red. El vendor ya resuelto se almacena y no se vuelve a consultar. | — | Media | Verificar que: (1) el sistema comprueba si el dispositivo ya tiene vendor antes de llamar a la API externa, (2) si el vendor ya existe, no se realiza la consulta externa, (3) tras resolver el vendor, se actualiza el registro. Tests de caché efectivo. | RF-14 |

### Disponibilidad

| ID | Nombre | Descripción | Actor(es) | Prioridad | Criterios de Aceptación | Dependencias |
|----|--------|-------------|-----------|-----------|------------------------|--------------|
| RNF-012 | Disponibilidad del sistema | El sistema debe tener una disponibilidad del 99.5% en entorno de producción, con mecanismos de recuperación ante fallos. | — | Media | Los servicios se ejecutan con política de reinicio automático. Health checks en cada servicio con reintentos. El API Gateway detecta servicios no disponibles. Documentación de procedimientos de recuperación. | — |
| RNF-019 | Health checks con verificación de dependencias | Los endpoints de salud deben verificar no solo el estado del propio servicio sino también la conectividad con sus dependencias (bases de datos, caché, otros servicios). | — | Media | Cada health check verifica: conectividad a base de datos, conectividad a caché (si aplica), conectividad a servicios dependientes. Responde solo si todo está correcto; indica qué dependencia falla en caso contrario. Tests de health check con dependencias simuladas caídas. | — |
| RNF-030 | Reintentos en anclaje blockchain | Si falla el anclaje de una acción en la blockchain, el sistema debe reintentar un número configurable de veces con un intervalo definido antes de considerar la operación como fallida. | — | Media | Verificar que el servicio de anclaje implementa reintentos con el número máximo de intentos y el intervalo de espera configurados. Si todos fallan, el error se propaga pero la operación principal no se revierte. Tests con el servicio de blockchain simulado caído. | RF-19 |

### Escalabilidad

| ID | Nombre | Descripción | Actor(es) | Prioridad | Criterios de Aceptación | Dependencias |
|----|--------|-------------|-----------|-----------|------------------------|--------------|
| RNF-023 | Escalabilidad horizontal de servicios | Los servicios backend deben ser sin estado para permitir escalado horizontal mediante múltiples réplicas. | — | Media | Verificar que: (1) no hay estado almacenado en el sistema de archivos local, (2) las sesiones se gestionan de forma independiente del servidor, (3) la configuración de despliegue permite escalar servicios. Tests con múltiples réplicas. | RNF-014, RNF-016 |

### Usabilidad

| ID | Nombre | Descripción | Actor(es) | Prioridad | Criterios de Aceptación | Dependencias |
|----|--------|-------------|-----------|-----------|------------------------|--------------|
| RNF-035 | Hidratación de sesión al cargar la página | Al cargar la aplicación web, si existe una cookie de refresh token, el sistema debe intentar renovar el access token automáticamente para mantener la sesión del usuario sin intervención. | — | Alta | La aplicación web ejecuta una renovación silenciosa al cargarse. Si la cookie es válida, establece la sesión. Si no, el usuario ve la pantalla de inicio de sesión. Tests de hidratación exitosa y fallida. | RF-02, RNF-027 |
| RNF-036 | Renovación automática de token | Si una petición HTTP recibe un error de autenticación por token expirado, el cliente HTTP de la aplicación web debe intentar renovar el token automáticamente mediante el refresh token y reenviar la petición original. Si la renovación falla, redirige al inicio de sesión. | — | Alta | El cliente captura respuestas de autenticación fallida, solicita silenciosamente un refresco de token y reintenta la petición original. Si el refresh falla, redirige al inicio de sesión. Las peticiones concurrentes en cola no duplican el refresco. Tests de renovación automática. | RF-02, RNF-035 |
| RNF-037 | Persistencia de sesión entre pestañas | La sesión del usuario debe persistirse en almacenamiento local del navegador (solo datos no sensibles como email y rol) para mantener el estado visual entre recargas de página. El access token no se persiste, solo se mantiene en memoria. | — | Media | El gestor de sesión guarda en almacenamiento local: email, role e indicador de autenticación, nunca el token. Al cargar la página, si existe el indicador, se intenta renovar la sesión. Los cambios de estado (inicio, cierre, renovación) actualizan el almacenamiento. Tests de persistencia. | RNF-006, RNF-035 |

### Mantenibilidad

| ID | Nombre | Descripción | Actor(es) | Prioridad | Criterios de Aceptación | Dependencias |
|----|--------|-------------|-----------|-----------|------------------------|--------------|
| RNF-013 | Logging centralizado | Todos los servicios deben enviar logs estructurados a un sistema centralizado para centralizar la observabilidad y facilitar la depuración. | — | Media | Cada servicio configura logging estructurado con transporte hacia el sistema centralizado. Los logs incluyen: timestamp, nivel, mensaje, nombre del servicio e identificador de correlación. Tests de integración verifican que los logs se envían correctamente. | — |
| RNF-014 | Contenerización | Todos los servicios deben ejecutarse como contenedores, orquestados mediante una herramienta de composición, en una red aislada. | — | Alta | Todos los servicios tienen definición de contenedor. El archivo de composición define los servicios con sus puertos, volúmenes, redes y dependencias. La red de servicios es de tipo aislado. Los puertos de administración solo se exponen localmente. La composición levanta todo el sistema sin errores. | — |
| RNF-016 | Segregación de responsabilidades | El backend debe dividirse en servicios independientes con responsabilidades bien definidas: identidad, telemetría, blockchain y auditoría. | — | Alta | Cada servicio tiene su propio repositorio de código, base de datos (si aplica) y configuración independiente. La comunicación entre servicios es vía HTTP con token interno. Los servicios se despliegan y escalan de forma independiente. | RNF-014 |
| RNF-017 | Enrutamiento por prefijo de ruta | Las rutas de cada funcionalidad se enrutan al servicio correspondiente según el prefijo de la ruta. | — | Alta | Verificar que las reglas de enrutamiento dirigen cada ruta al servicio correcto con el prefijo normalizado. Tests de integración confirman que cada ruta llega al servicio correcto. | RNF-015 |
| RNF-031 | Modo de anclaje configurable | El anclaje en blockchain debe poder configurarse como bloqueante (la operación espera confirmación) o no bloqueante (la operación continúa sin esperar confirmación), mediante una variable de entorno. | — | Baja | Verificar que: (1) el modo bloqueante espera respuesta de la red, (2) el modo no bloqueante no espera, (3) el comportamiento se puede cambiar sin modificar código. Tests con ambos modos. | RNF-030 |
| RNF-033 | Catálogo de categorías de dispositivos IoT | El sistema debe definir un catálogo fijo de categorías de dispositivos IoT contra el cual validar los dispositivos registrados. | — | Media | El catálogo contiene exactamente el conjunto definido de categorías. El sistema rechaza categorías no válidas. Tests de validación de categoría. | RF-14 |
| RNF-034 | Configuración mediante variables de entorno | Todos los parámetros de configuración del sistema deben definirse mediante variables de entorno, no valores fijos en el código. | — | Alta | Verificar que cada servicio carga configuración desde variables de entorno. Cada variable tiene un valor por defecto o validación de existencia. Un archivo de ejemplo documenta todas las variables. Tests de configuración con diferentes combinaciones. | RNF-014 |
| RNF-038 | Mapa estático de API Keys para desarrollo | El sistema debe soportar un mapa estático de API Keys configurado mediante variable de entorno para entornos de desarrollo, permitiendo la ingesta de telemetría sin depender del servicio de identidad. | — | Baja | Verificar que: (1) la variable de entorno puede contener pares de clave y ecosistema, (2) la validación prueba el mapa estático antes de llamar al servicio de identidad, (3) en producción esta variable no debe estar definida. Tests con y sin mapa estático. | RNF-007 |

---

## Resumen por tipo

| Tipo | Cantidad | IDs |
|------|:--------:|-----|
| **Funcional** | 26 | RF-01 → RF-26 |
| **Seguridad** | 21 | RNF-001, RNF-002, RNF-003, RNF-004, RNF-005, RNF-006, RNF-009, RNF-010, RNF-015, RNF-018, RNF-020, RNF-021, RNF-022, RNF-024, RNF-025, RNF-026, RNF-027, RNF-028, RNF-029, RNF-032, RNF-039 |
| **Rendimiento** | 4 | RNF-007, RNF-008, RNF-011, RNF-040 |
| **Disponibilidad** | 3 | RNF-012, RNF-019, RNF-030 |
| **Escalabilidad** | 1 | RNF-023 |
| **Usabilidad** | 3 | RNF-035, RNF-036, RNF-037 |
| **Mantenibilidad** | 8 | RNF-013, RNF-014, RNF-016, RNF-017, RNF-031, RNF-033, RNF-034, RNF-038 |
| | | |
| **Total** | **66** | **26 RF + 40 RNF** |
