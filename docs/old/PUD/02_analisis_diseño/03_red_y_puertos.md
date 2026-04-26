# Definición de Red Interna y Gestión de Puertos (Docker)

## 1. Topología de Red: Aislamiento mediante Custom Bridge
Para garantizar el aislamiento de los componentes y evitar la exposición accidental de servicios críticos, la arquitectura se despliega sobre una red virtual privada gestionada por Docker Engine.

* **Nombre de la red:** `aurora-secure-net`
* **Driver:** `bridge`
* **Justificación:** El uso de una red tipo *bridge* personalizada (en lugar de la red *bridge* por defecto de Docker) proporciona aislamiento automático y habilitación de resolución DNS interna. Esto permite que los contenedores se comuniquen entre sí utilizando el nombre del servicio (ej. `http://auth-service:3001`) sin necesidad de conocer sus direcciones IP internas dinámicas, facilitando la escalabilidad y el despliegue.

## 2. Matriz de Puertos y Exposición
Se aplica una política estricta de *Deny-All* (Denegar Todo) hacia el exterior. Únicamente el API Gateway tiene permiso para mapear puertos hacia las interfaces de red del servidor *host*. Ninguna base de datos ni microservicio de negocio es accesible directamente desde Internet o desde la red local del servidor.

| Contenedor / Servicio | Puerto Interno (TCP) | Puerto Expuesto al Host | Accesibilidad | Descripción / Función |
| :--- | :--- | :--- | :--- | :--- |
| **Traefik (API Gateway)** | `80` / `443` | **`80` / `443`** | **Pública** | Único punto de entrada. Terminación TLS y enrutamiento dinámico. |
| **WebApp (Next.js BFF)** | `3000` | Ninguno | Interna | Interfaz de usuario servida a través de Traefik. |
| **Auth-Service** | `3001` | Ninguno | Interna | Bóveda de identidades. Accesible por WebApp y Traefik. |
| **IoT-Manager** | `3002` | Ninguno | Interna | Motor de ingesta masiva. Accesible por WebApp y Traefik. |
| **BC-Service (Proxy)** | `3003` | Ninguno | Interna | Pasarela DLT Zero-Trust. **Solo** accesible por Auth e IoT-Manager. |
| **PostgreSQL** | `5432` | Ninguno | Interna | Base de datos relacional. **Solo** accesible por Auth-Service. |
| **MongoDB Time Series** | `27017` | Ninguno | Interna | Base de datos NoSQL. **Solo** accesible por IoT-Manager. |

## 3. Reglas de Seguridad y Segmentación Lógica
Aunque todos los contenedores residen en la red `aurora-secure-net`, la comunicación interna sigue un modelo de mínimos privilegios reforzado a nivel de aplicación (Zero-Trust):

1. **Terminación TLS Centralizada:** Todo el tráfico externo llega cifrado (HTTPS/WSS) y es descifrado por Traefik en el borde de la red. El tráfico interno (Este-Oeste) entre contenedores viaja en claro (`HTTP`), asumiendo que la red virtual de Docker es un entorno encapsulado, mitigando la sobrecarga computacional de cifrar el tráfico local.
2. **Proxy Inverso Estricto:** Si un atacante intenta acceder al puerto `3001` de la IP pública del servidor, el firewall del sistema operativo (y Docker) rechazará la conexión, ya que ese puerto no existe a nivel de *host*.
3. **Muro de Contención DLT:** Los servicios periféricos no tienen ruta directa ni credenciales para alcanzar Hyperledger FireFly. Deben pasar obligatoriamente por el `bc-service` (puerto `3003`), el cual inyecta el certificado mTLS necesario para salir de la red `aurora-secure-net` hacia la infraestructura blockchain.