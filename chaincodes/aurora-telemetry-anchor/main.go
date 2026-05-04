package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// TelemetryAnchor representa un anclaje de telemetría en el ledger de Fabric
type TelemetryAnchor struct {
	IngestID      string `json:"ingestId"`      // ID único de ingesta generado por iot-manager
	EcosystemID   string `json:"ecosystemId"`   // Identificador del ecosistema propietario
	TelemetryHash string `json:"telemetryHash"` // Hash SHA-256 del payload (incluye GPS)
	Signature     string `json:"signature"`     // Firma digital emitida por auth-service
	PublicKey     string `json:"publicKey"`     // Clave pública del firmante
	AnchorTxID    string `json:"anchorTxId"`    // ID de transacción Fabric para localizar bloque
	AnchoredAt    string `json:"anchoredAt"`    // Timestamp ISO-8601 del momento del anclaje
}

// TelemetryAnchorSmartContract proporciona las funciones para gestionar anclajes de telemetría
type TelemetryAnchorSmartContract struct {
	contractapi.Contract
}

// AnchorTelemetry persiste un nuevo anclaje de telemetría en el ledger de Fabric.
// Previene anclajes duplicados para el mismo ingestId.
// Emite un evento chaincode "TelemetryAnchored" al completarse con éxito.
//
// Parámetros:
// - ingestId: ID único de la ingesta de iot-manager (clave primaria en world state)
// - ecosystemId: ID del ecosistema propietario de los datos
// - telemetryHash: Hash SHA-256 del payload (debe tener 64 caracteres hexadecimales)
// - signature: Firma digital del hash emitida por auth-service (KMS)
// - publicKey: Clave pública correspondiente al firmante
func (s *TelemetryAnchorSmartContract) AnchorTelemetry(ctx contractapi.TransactionContextInterface, ingestId string, ecosystemId string, telemetryHash string, signature string, publicKey string) error {
	if strings.TrimSpace(ingestId) == "" {
		return fmt.Errorf("ingestId es obligatorio")
	}
	if strings.TrimSpace(ecosystemId) == "" {
		return fmt.Errorf("ecosystemId es obligatorio")
	}
	if !isValidSHA256(telemetryHash) {
		return fmt.Errorf("telemetryHash debe ser un hash SHA-256 hexadecimal válido (64 caracteres)")
	}
	if strings.TrimSpace(signature) == "" {
		return fmt.Errorf("signature es obligatorio")
	}
	if strings.TrimSpace(publicKey) == "" {
		return fmt.Errorf("publicKey es obligatorio")
	}

	// Verificar si ya existe un anclaje con el mismo ingestId (evita duplicados en tiempo)
	existingJSON, err := ctx.GetStub().GetState(ingestId)
	if err != nil {
		return fmt.Errorf("error al leer del world state: %v", err)
	}
	if existingJSON != nil {
		return fmt.Errorf("ya existe un anclaje con ingestId '%s'", ingestId)
	}

	// Obtener el ID de transacción de Fabric y generar timestamp ISO-8601
	txID := ctx.GetStub().GetTxID()
	now := time.Now().UTC().Format(time.RFC3339)

	anchor := TelemetryAnchor{
		IngestID:      ingestId,
		EcosystemID:   ecosystemId,
		TelemetryHash:  telemetryHash,
		Signature:      signature,
		PublicKey:      publicKey,
		AnchorTxID:    txID,
		AnchoredAt:     now,
	}

	anchorJSON, err := json.Marshal(anchor)
	if err != nil {
		return fmt.Errorf("error al serializar el anclaje: %v", err)
	}

	// Guardar en world state usando ingestId como clave primaria
	if err := ctx.GetStub().PutState(ingestId, anchorJSON); err != nil {
		return fmt.Errorf("error al guardar en world state: %v", err)
	}

	// Crear composite key para consultas eficientes por ecosistema y tiempo
	// Formato: ecosystem.Anchor~{ecosystemId}~{anchoredAt}~{ingestId}
	compositeKey, err := ctx.GetStub().CreateCompositeKey("ecosystem.Anchor", []string{ecosystemId, now, ingestId})
	if err != nil {
		return fmt.Errorf("error al crear composite key: %v", err)
	}
	// El valor de la composite key es nulo, solo importa la existencia de la clave para iterar
	if err := ctx.GetStub().PutState(compositeKey, []byte{0x00}); err != nil {
		return fmt.Errorf("error al almacenar composite key: %v", err)
	}

	// Emitir evento para que FireFly pueda notificar a iot-manager
	ctx.GetStub().SetEvent("TelemetryAnchored", anchorJSON)

	return nil
}

// QueryByIngestID recupera un anclaje mediante su ingestId (clave primaria).
func (s *TelemetryAnchorSmartContract) QueryByIngestID(ctx contractapi.TransactionContextInterface, ingestId string) (*TelemetryAnchor, error) {
	anchorJSON, err := ctx.GetStub().GetState(ingestId)
	if err != nil {
		return nil, fmt.Errorf("error al leer del world state: %v", err)
	}
	if anchorJSON == nil {
		return nil, fmt.Errorf("no existe un anclaje con ingestId '%s'", ingestId)
	}

	var anchor TelemetryAnchor
	if err := json.Unmarshal(anchorJSON, &anchor); err != nil {
		return nil, fmt.Errorf("error al deserializar el anclaje: %v", err)
	}

	return &anchor, nil
}

// QueryByHash recupera todos los anclajes que coincidan con un hash SHA-256.
// Itera sobre el ledger para encontrar entradas coincidentes.
// Permite encontrar el mismo contenido anclado en diferentes momentos (distintos ingestId).
func (s *TelemetryAnchorSmartContract) QueryByHash(ctx contractapi.TransactionContextInterface, telemetryHash string) ([]*TelemetryAnchor, error) {
	if !isValidSHA256(telemetryHash) {
		return nil, fmt.Errorf("telemetryHash debe ser un hash SHA-256 hexadecimal válido")
	}

	// Iterar sobre todo el rango de claves del world state
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("error al obtener rango de estados: %v", err)
	}
	defer resultsIterator.Close()

	var anchors []*TelemetryAnchor
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("error al iterar: %v", err)
		}

		// Ignorar composite keys y claves vacías
		if queryResponse.Key == "" || strings.HasPrefix(queryResponse.Key, "\x00") || strings.Contains(queryResponse.Key, "ecosystem.Anchor") {
			continue
		}

		var anchor TelemetryAnchor
		if err := json.Unmarshal(queryResponse.Value, &anchor); err != nil {
			continue
		}

		// Comparar hash (el mismo contenido puede estar en distintos ingestId)
		if anchor.TelemetryHash == telemetryHash {
			anchors = append(anchors, &anchor)
		}
	}

	return anchors, nil
}

// QueryByEcosystem recupera todos los anclajes de un ecosistema,
// opcionalmente filtrados por un rango de tiempo (startTime, endTime en formato ISO-8601).
// Utiliza composite keys para realizar consultas eficientes sin recorrer todo el ledger.
func (s *TelemetryAnchorSmartContract) QueryByEcosystem(ctx contractapi.TransactionContextInterface, ecosystemId string, startTime string, endTime string) ([]*TelemetryAnchor, error) {
	if strings.TrimSpace(ecosystemId) == "" {
		return nil, fmt.Errorf("ecosystemId es obligatorio")
	}

	// Iterar sobre las composite keys del ecosistema para obtener los ingestIds
	iterator, err := ctx.GetStub().GetStateByPartialCompositeKey("ecosystem.Anchor", []string{ecosystemId})
	if err != nil {
		return nil, fmt.Errorf("error al obtener iterador de composite keys: %v", err)
	}
	defer iterator.Close()

	// Map para evitar duplicados al reconstruir desde composite keys
	anchorIDs := make(map[string]bool)
	for iterator.HasNext() {
		response, err := iterator.Next()
		if err != nil {
			return nil, fmt.Errorf("error al iterar composite keys: %v", err)
		}

		// Descomponer la composite key: ecosystem.Anchor~{ecosystemId}~{anchoredAt}~{ingestId}
		_, compositeKeyParts, err := ctx.GetStub().SplitCompositeKey(response.Key)
		if err != nil {
			continue
		}

		// El ingestId está en la tercera posición de la composite key
		if len(compositeKeyParts) >= 3 {
			anchorIDs[compositeKeyParts[2]] = true
		}
	}

	// Recuperar los detalles completos de cada anclaje
	var anchors []*TelemetryAnchor
	for ingestId := range anchorIDs {
		anchor, err := s.QueryByIngestID(ctx, ingestId)
		if err != nil {
			continue
		}
		// Verificar que pertenezca al ecosistema y, si aplica, al rango de tiempo
		if anchor.EcosystemID == ecosystemId {
			if startTime != "" && endTime != "" {
				if anchor.AnchoredAt >= startTime && anchor.AnchoredAt <= endTime {
					anchors = append(anchors, anchor)
				}
			} else {
				anchors = append(anchors, anchor)
			}
		}
	}

	return anchors, nil
}

// isValidSHA256 comprueba si una cadena es un hash SHA-256 hexadecimal válido (64 caracteres).
func isValidSHA256(hash string) bool {
	if len(hash) != 64 {
		return false
	}
	for _, c := range hash {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return false
		}
	}
	return true
}

// main inicializa y arranca el chaincode en el peer de Fabric.
func main() {
	chaincode, err := contractapi.NewChaincode(&TelemetryAnchorSmartContract{})
	if err != nil {
		panic(fmt.Sprintf("Error al crear el chaincode TelemetryAnchor: %v", err))
	}

	if err := chaincode.Start(); err != nil {
		panic(fmt.Sprintf("Error al iniciar el chaincode TelemetryAnchor: %v", err))
	}
}
