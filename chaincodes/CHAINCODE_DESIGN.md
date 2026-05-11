# Diseño y Estándares de Chaincodes - Plataforma Aurora

Este documento establece la estrategia arquitectónica y las normativas de implementación para los contratos inteligentes (*chaincodes*) de la plataforma Aurora, documentando y justificando la evolución desde el modelo tradicional de bajo nivel (*Shim*) hacia el estándar moderno de alto nivel (*Contract API*).

---

## 1. Decisión de Diseño: Estandarización a Contract API

A partir de la versión 1.1, la arquitectura de la plataforma Aurora establece que la totalidad de los *chaincodes* deben desarrollarse utilizando el *framework* de alto nivel `fabric-contract-api-go`.

### Motivación Arquitectónica
La plataforma Aurora requiere un ciclo de integración y despliegue continuo (CI/CD) altamente automatizado para su pasarela de servicios e indexación de eventos (Hyperledger FireFly). 

Mantener implementaciones basadas en el enrutamiento dinámico manual (*Shim* clásico) obliga a redactar y mantener de forma manual los contratos de interfaz declarativa (archivos FFI JSON), introduciendo un vector innecesario de desincronización y error humano. La adopción de **Contract API** permite que el código sea completamente autodescriptivo mediante reflexión en tiempo de ejecución, habilitando inferencia estática automatizada, tipado seguro en la capa de red y generación nativa de especificaciones OpenAPI/Swagger.

---

## 2. Comparativa Técnica: Shim Clásico vs. Contract API

El ecosistema de desarrollo en Go para Hyperledger Fabric ofrece dos grandes paradigmas. A continuación se contrastan las implicaciones de diseño de cada enfoque:

| Dimensión Técnica | Shim Clásico (*Low-Level*) | Contract API (*High-Level*) |
| :--- | :--- | :--- |
| **Nivel de Abstracción** | Muy bajo. Interacción cruda con *buffers* de *bytes*. | Alto. Orientado a objetos, estructuras y métodos. |
| **Enrutamiento** | Manual. Requiere capturar un punto único e implementar un `switch`. | Automático. Mapeo directo y transparente a métodos públicos. |
| **Serialización** | Manual. Desempaquetado de `args[]` y uso de `json.Unmarshal`. | Automática. Inyección directa de parámetros tipados en la firma. |
| **Rendimiento (*Runtime*)**| Máximo. Acceso directo al estado sin intermediarios. | Ligera sobrecarga (*overhead*) por uso de reflexión (`reflect`). |
| **Mantenibilidad** | Compleja. Propenso a *boilerplate* y lógicas monolíticas. | Alta. Código modular, autodocumentado y declarativo. |
| **Gobernanza (Pasarelas)**| Requiere definición explícita y manual de esquemas FFI. | Inferencia 100% automatizada de interfaces REST y eventos. |

---

## 3. Ventajas y Desventajas de Contract API

La adopción de este estándar asume compromisos técnicos (*trade-offs*) evaluados formalmente en el diseño del sistema:

### Ventajas Principales
* **Productividad y Limpieza:** Elimina drásticamente el código repetitivo (*boilerplate*), suprimiendo la fontanería de validación de arrays y enrutamiento manual.
* **Seguridad de Tipos Estricta:** El *framework* intercepta la petición y valida que los tipos de datos JSON de entrada coincidan exactamente con la firma del método antes de invocar la lógica de negocio.
* **Sinergia con FireFly:** Habilita el uso de analizadores estáticos simples (`goParser`) y herramientas nativas que deducen la interfaz al instante sin requerir dependencias externas.

### Desventajas y Costes Ocultos
* **Huella de Memoria y Tamaño:** El binario compilado resultante es notablemente más pesado al importar los motores de esquemas y validación, afectando levemente a los tiempos de arranque en frío (*cold start*).
* **Penalización por Reflexión:** Inspeccionar tipos dinámicamente en tiempo de ejecución consume marginalmente más ciclos de CPU por transacción.
* **Pérdida de Intercepción Temprana:** No es posible rechazar tramas maliciosas o ataques de denegación de servicio (DoS) analizando los *bytes* crudos antes de que el *framework* intente procesarlos.

---

## 4. Guía de Implementación con Contract API

Para asegurar que un nuevo *chaincode* sea compatible con las normativas de Aurora y permita la generación de interfaces automatizadas, la programación debe ceñirse a los siguientes patrones estructurales:

### A. Definición del Contrato Principal
Toda lógica debe encapsularse en una estructura propia que embeba de forma anónima la clase `contractapi.Contract`.

```go
package main

import (
	"fmt"
	"[github.com/hyperledger/fabric-contract-api-go/contractapi](https://github.com/hyperledger/fabric-contract-api-go/contractapi)"
)

// AuroraSmartContract centraliza la lógica de negocio del módulo
type AuroraSmartContract struct {
	contractapi.Contract
}

```

### B. Firmas de Métodos Públicos

Cada operación expuesta a la red debe ser un **método receptor** de la estructura principal. El primer argumento es estrictamente obligatorio y debe ser el contexto transaccional (`contractapi.TransactionContextInterface`).

```go
// AnchorAction registra una entrada inmutable. 
// Los parámetros 'actionID' y 'nonce' se inyectan ya tipados y validados.
func (s *AuroraSmartContract) AnchorAction(ctx contractapi.TransactionContextInterface, actionID string, nonce string) error {
	
	// Acceso seguro al stub a través del contexto
	stub := ctx.GetStub()
	
	exists, err := stub.GetState(actionID)
	if err != nil {
		return fmt.Errorf("error al leer el estado: %v", err)
	}
	if exists != nil {
		return fmt.Errorf("la colisión de identificadores no está permitida")
	}

	return stub.PutState(actionID, []byte(nonce))
}

```

### C. Restricciones en los Parámetros

* **Prohibición de genéricos:** Queda estrictamente prohibido utilizar firmas pasivas como `args []string` o recibir un único *payload* en crudo para desempaquetar por software.
* **Uso de Estructuras:** Para peticiones complejas, defina un `struct` con etiquetas JSON explícitas (`json:"nombre_campo"`). El *framework* y el *parser* mapearán los campos automáticamente hacia el cuerpo de la petición HTTP POST.

### D. Inicialización Minimalista

El archivo principal (`main.go`) debe actuar únicamente como lanzador, delegando el registro y la ejecución al motor del *framework*.

```go
func main() {
	cc, err := contractapi.NewChaincode(&AuroraSmartContract{})
	if err != nil {
		panic(fmt.Sprintf("Error al instanciar el contrato inteligente: %v", err))
	}

	if err := cc.Start(); err != nil {
		panic(fmt.Sprintf("Error al arrancar el bucle del chaincode: %v", err))
	}
}

```
