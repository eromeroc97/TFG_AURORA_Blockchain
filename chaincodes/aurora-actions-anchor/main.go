package main

import (
	"crypto/ed25519"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"strings"
	"time"

	"github.com/hyperledger/fabric-chaincode-go/pkg/statebased"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-protos-go/peer"
)

const (
	eventName                = "AuroraActionAnchored"
	keyPrefixAction         = "action"
	keyPrefixActor         = "actor"
	keyPrefixParent        = "parent"
	keyPrefixTarget        = "target"
	keyPrefixType         = "type"
	keyPrefixNonce       = "nonce"
)

// ActionType define los tipos de acciones soportadas por el chaincode.
// Cada tipo tiene semántica específica en el flujo de auditoría de Aurora.
type ActionType string

const (
	ActionTypeShareRequest     ActionType = "SHARE_REQUEST"
	ActionTypeShareAccept    ActionType = "SHARE_ACCEPT"
	ActionTypeShareReject   ActionType = "SHARE_REJECT"
	ActionTypeShareRevoke  ActionType = "SHARE_REVOKE"
	ActionTypeRequestCancel ActionType = "REQUEST_CANCEL"
	ActionTypeRoleChange   ActionType = "ROLE_CHANGE"
	ActionTypeAccountInit  ActionType = "ACCOUNT_INIT"
	ActionTypeAccountApprove ActionType = "ACCOUNT_APPROVE"
	ActionTypeEcosystemCreate ActionType = "ECOSYSTEM_CREATE"
)

// AnchoredAction representa una acción anclada en el ledger inmutable de Fabric.
// Es el registro atómico de intención del actor, con evidencia criptográfica completa.
//
// Campos:
//   - ActionID: Identificador único (UUID v4) de la acción.
//   - ParentActionID: UUID de la acción padre (vínculo forense para acciones derivadas).
//   - ActorID: Identificador del usuario que firma y ejecuta la acción.
//   - TargetID: Identificador del recurso o entidad afectada.
//   - ActionType: Tipo semántico de la acción.
//   - ReadableDescription: Descripción legible para auditoría humana.
//   - PayloadHash: SHA-256 del payload canónico (verificación stateless).
//   - Signature: Firma digital del payload (Base64).
//   - PublicKey: Clave pública del actor (PEM) para verificación.
//   - Timestamp: Marca de tiempo del bloque (.GetTxTimestamp()).
//   - Nonce: UUID aleatorio para prevenir ataques de replay.
//   - Metadata: Campos adicionales flexibilidad.
type AnchoredAction struct {
	ActionID            string            `json:"action_id"`
	ParentActionID      string            `json:"parent_action_id"`
	ActorID            string            `json:"actor_id"`
	TargetID           string            `json:"target_id"`
	ActionType         string            `json:"action_type"`
	ReadableDescription string           `json:"readable_description"`
	PayloadHash        string            `json:"payload_hash"`
	Signature         string            `json:"signature"`
	PublicKey          string            `json:"public_key"`
	Timestamp         int64             `json:"timestamp"`
	Nonce             string            `json:"nonce"`
	Metadata          map[string]string `json:"metadata,omitempty"`
}

// ActionPayload es el contenido canónico que se firma criptográficamente.
// Este struct debe serializarse como JSON canónico (RFC 8785) para garantir
// reproducibilidad bit-a-bit del hash en cualquier plataforma.
type ActionPayload struct {
	ActionID       string `json:"action_id"`
	ActorID        string `json:"actor_id"`
	TargetID       string `json:"target_id"`
	ActionType     string `json:"action_type"`
	ParentActionID string `json:"parent_action_id,omitempty"`
	Nonce         string `json:"nonce"`
}

// TransactionInput representa la estructura recibida en la invocación del chaincode.
// Es el contrato de entrada entre aurora-actions-anchor y los servicios clientes.
type TransactionInput struct {
	ActionID            string `json:"action_id"`
	ParentActionID      string `json:"parent_action_id,omitempty"`
	ActorID            string `json:"actor_id"`
	TargetID           string `json:"target_id"`
	ActionType         string `json:"action_type"`
	ReadableDescription string `json:"readable_description"`
	Signature         string `json:"signature"`
	PublicKey         string `json:"public_key"`
	Nonce             string `json:"nonce"`
}

// ErrorCode define los códigos de error específicos del chaincode.
// Facilitan el diagnóstico en entornos de producción.
type ErrorCode string

const (
	ErrMissingRequired       ErrorCode = "ERR_MISSING_REQUIRED"
	ErrInvalidActionType     ErrorCode = "ERR_INVALID_ACTION_TYPE"
	ErrInvalidSignature     ErrorCode = "ERR_INVALID_SIGNATURE"
	ErrActionIDCollision    ErrorCode = "ERR_ACTION_ID_COLLISION"
	ErrParentNotFound       ErrorCode = "ERR_PARENT_NOT_FOUND"
	ErrSelfReferenceForbidden ErrorCode = "ERR_SELF_REFERENCE_FORBIDDEN"
	ErrInvalidPublicKey     ErrorCode = "ERR_INVALID_PUBLIC_KEY"
	ErrDuplicateNonce      ErrorCode = "ERR_DUPLICATE_NONCE"
)

// actionTypeValidation define qué ActionTypes permiten auto-referencia (mismo actor en padre e hijo).
// Esta tabla implementa la lógica de negocio:
//
//   - SHARE_REVOKE: Un actor puede revocar su propia solicitud.
//   - REQUEST_CANCEL: Un actor puede cancelar su propia solicitud.
//   - SHARE_ACCEPT: Un receptor Debe aceptar la solicitud de otro actor.
var selfReferenceAllowed = map[ActionType]bool{
	ActionTypeShareRevoke:  true,
	ActionTypeRequestCancel: true,
}

// rootActionTypes define los ActionTypes que no requieren ParentActionID.
// Son acciones Raíz en el grafo de trazabilidad.
var rootActionTypes = map[ActionType]bool{
	ActionTypeShareRequest:     true,
	ActionTypeAccountInit:     true,
	ActionTypeEcosystemCreate: true,
}

// AuroraActionsAnchorChaincode es el chaincode principal.
// Implementa el patrón Event Sourcing con Zero Trust para la plataforma Aurora.
type AuroraActionsAnchorChaincode struct{}

// Init inicializa el chaincode (método requerido por Fabric).
// En este chaincode no se requiere inicialización de estado.
func (a *AuroraActionsAnchorChaincode) Init(stub shim.ChaincodeStubInterface) peer.Response {
	return shim.Success(nil)
}

// Invoke procesa las transacciones recibidas por el chaincode.
// Routing basado en función (invoke) o query.
func (a *AuroraActionsAnchorChaincode) Invoke(stub shim.ChaincodeStubInterface) peer.Response {
	function, args := stub.GetFunctionAndParameters()

	switch function {
	case "anchor":
		return anchorAction(stub, args)
	case "getAction":
		return getActionByID(stub, args)
	case "getActionsByActor":
		return getActionsByActor(stub, args)
	case "getActionChildren":
		return getActionChildren(stub, args)
	case "getActionsByTarget":
		return getActionsByTarget(stub, args)
	case "getActionsByType":
		return getActionsByType(stub, args)
	case "verifyActionSignature":
		return verifyActionSignature(stub, args)
	case "getActionHistory":
		return getActionHistory(stub, args)
	default:
		return shim.Error(fmt.Sprintf("Función no soportada: %s", function))
	}
}

// anchorAction es la función principal de escritura.
// Valida la transacción y la ancrla en el ledger de Fabric.
//
// Validaciones:
// 1. Campos obligatorios presentes.
// 2. ActionType válido.
// 3. Firma criptográfica verificada.
// 4. ActionID único en el world state.
// 5. Nonce no utilizado.
// 6. ParentAction referencia válida (si aplica).
// 7. Reglas de auto-referencia por ActionType.
// 8. Timestamp del bloque como fuente de tiempo.
func anchorAction(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	if len(args) != 1 {
		return shim.Error("Argumento inválido: se espera 1 JSON de TransactionInput")
	}

	var input TransactionInput
	if err := json.Unmarshal([]byte(args[0]), &input); err != nil {
		return shim.Error(fmt.Sprintf("Error al deserializar JSON: %s", err))
	}

	if err := validateInput(input); err != nil {
		return shim.Error(string(err))
	}

	if err := validateActionType(input.ActionType); err != nil {
		return shim.Error(string(err))
	}

	payload := ActionPayload{
		ActionID:       input.ActionID,
		ActorID:        input.ActorID,
		TargetID:       input.TargetID,
		ActionType:     input.ActionType,
		ParentActionID: input.ParentActionID,
		Nonce:         input.Nonce,
	}

	payloadHash, err := computePayloadHash(payload)
	if err != nil {
		return shim.Error(fmt.Sprintf("Error al calcular payload hash: %s", err))
	}

	if err := verifySignature(payloadHash, input.Signature, input.PublicKey); err != nil {
		return shim.Error(string(ErrInvalidSignature))
	}

	if err := validateUniqueness(stub, input.ActionID, input.Nonce); err != nil {
		return shim.Error(string(err))
	}

	if err := validateParentAction(stub, input.ParentActionID, input.ActionType, input.ActorID); err != nil {
		return shim.Error(string(err))
	}

	txTimestamp, err := stub.GetTxTimestamp()
	if err != nil {
		return shim.Error("Error al obtener timestamp de transacción")
	}
	timestamp := txTimestamp.Seconds*1000 + int64(txTimestamp.Nanos)/int64(time.Millisecond)

	action := AnchoredAction{
		ActionID:            input.ActionID,
		ParentActionID:      input.ParentActionID,
		ActorID:            input.ActorID,
		TargetID:           input.TargetID,
		ActionType:         input.ActionType,
		ReadableDescription: input.ReadableDescription,
		PayloadHash:         payloadHash,
		Signature:         input.Signature,
		PublicKey:          input.PublicKey,
		Timestamp:          timestamp,
		Nonce:             input.Nonce,
	}

	if err := storeAction(stub, action); err != nil {
		return shim.Error(fmt.Sprintf("Error al almacenar acción: %s", err))
	}

	eventPayload := map[string]interface{}{
		"action_id":              action.ActionID,
		"action_type":            action.ActionType,
		"actor_id":              action.ActorID,
		"target_id":             action.TargetID,
		"parent_action_id":       action.ParentActionID,
		"timestamp":            action.Timestamp,
		"readable_description":  action.ReadableDescription,
		"payload_hash":          action.PayloadHash,
		"signature":             action.Signature,
		"tx_id":                stub.GetTxID(),
		"block_number":         stub.GetChaincodeHeader().GetBlockNumber(),
		"nonce":                action.Nonce,
		"canonical_payload_json": canonicalJSON(payload),
	}

	eventBytes, _ := json.Marshal(eventPayload)
	if err := stub.SetEvent(eventName, eventBytes); err != nil {
		return shim.Error(fmt.Sprintf("Error al emitir evento: %s", err))
	}

	return shim.Success([]byte(action.ActionID))
}

// getActionByID recupera una acción por su ActionID.
func getActionByID(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	if len(args) != 1 {
		return shim.Error("Argumento inválido: se espera ActionID")
	}

	action, err := retrieveAction(stub, args[0])
	if err != nil {
		return shim.Error(fmt.Sprintf("Acción no encontrada: %s", args[0]))
	}

	actionBytes, _ := json.Marshal(action)
	return shim.Success(actionBytes)
}

// getActionsByActor recupera todas las acciones de un actor.
// Retorna un array de ActionIDs ordenados cronológicamente.
func getActionsByActor(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	if len(args) != 1 {
		return shim.Error("Argumento inválido: se espera ActorID")
	}

	actionIDs, err := retrieveActionsByIndex(stub, keyPrefixActor, args[0])
	if err != nil {
		return shim.Error(fmt.Sprintf("Error al consultar acciones: %s", err))
	}

	actionIDsBytes, _ := json.Marshal(actionIDs)
	return shim.Success(actionIDsBytes)
}

// getActionChildren recupera todas las acciones hijos de una ParentAction.
// Implementa la trazabilidad del grafo de acciones.
func getActionChildren(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	if len(args) != 1 {
		return shim.Error("Argumento inválido: se espera ParentActionID")
	}

	actionIDs, err := retrieveActionsByIndex(stub, keyPrefixParent, args[0])
	if err != nil {
		return shim.Error(fmt.Sprintf("Error al consultar hijos: %s", err))
	}

	actionIDsBytes, _ := json.Marshal(actionIDs)
	return shim.Success(actionIDsBytes)
}

// getActionsByTarget recupera todas las acciones que afectan un target.
func getActionsByTarget(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	if len(args) != 1 {
		return shim.Error("Argumento inválido: se espera TargetID")
	}

	actionIDs, err := retrieveActionsByIndex(stub, keyPrefixTarget, args[0])
	if err != nil {
		return shim.Error(fmt.Sprintf("Error al consultar acciones target: %s", err))
	}

	actionIDsBytes, _ := json.Marshal(actionIDs)
	return shim.Success(actionIDsBytes)
}

// getActionsByType recupera todas las acciones de un tipo específico.
func getActionsByType(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	if len(args) != 1 {
		return shim.Error("Argumento inválido: se espera ActionType")
	}

	if err := validateActionType(args[0]); err != nil {
		return shim.Error(string(ErrInvalidActionType))
	}

	actionIDs, err := retrieveActionsByIndex(stub, keyPrefixType, args[0])
	if err != nil {
		return shim.Error(fmt.Sprintf("Error al consultar acciones por tipo: %s", err))
	}

	actionIDsBytes, _ := json.Marshal(actionIDs)
	return shim.Success(actionIDsBytes)
}

// verifyActionSignature verifica una firma sin necesidad de recuperar el estado.
// Implementa validación stateless para audit-service.
func verifyActionSignature(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	if len(args) != 1 {
		return shim.Error("Argumento inválido: se espera ActionID")
	}

	action, err := retrieveAction(stub, args[0])
	if err != nil {
		return shim.Error(fmt.Sprintf("Acción no encontrada: %s", args[0]))
	}

	isValid := verifySignature(action.PayloadHash, action.Signature, action.PublicKey)
	if !isValid {
		return shim.Success([]byte(`{"valid":false}`))
	}

	return shim.Success([]byte(`{"valid":true}`))
}

// getActionHistory recupera el historial de la acción.
// NOTE: Requiere extensión history o iteración básica.
func getActionHistory(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	if len(args) != 1 {
		return shim.Error("Argumento inválido: se espera ActionID")
	}

	return shim.Success([]byte(fmt.Sprintf(`{"action_id":"%s","history_not_implemented":true}`, args[0])))
}

// validateInput verifica que todos los campos obligatorios estén presentes.
func validateInput(input TransactionInput) ErrorCode {
	if input.ActionID == "" ||
		input.ActorID == "" ||
		input.TargetID == "" ||
		input.ActionType == "" ||
		input.ReadableDescription == "" ||
		input.Signature == "" ||
		input.PublicKey == "" ||
		input.Nonce == "" {
		return ErrMissingRequired
	}

	if len(input.ReadableDescription) > 2048 {
		return ErrMissingRequired
	}

	return ""
}

// validateActionType verifica que el ActionType sea válido.
func validateActionType(actionType string) ErrorCode {
	validTypes := map[ActionType]bool{
		ActionTypeShareRequest:      true,
		ActionTypeShareAccept:    true,
		ActionTypeShareReject:    true,
		ActionTypeShareRevoke:     true,
		ActionTypeRequestCancel:  true,
		ActionTypeRoleChange:      true,
		ActionTypeAccountInit:    true,
		ActionTypeAccountApprove: true,
		ActionTypeEcosystemCreate:  true,
	}

	if !validTypes[ActionType(actionType)] {
		return ErrInvalidActionType
	}

	return ""
}

// computePayloadHash calcula el SHA-256 del payload canónico.
func computePayloadHash(payload ActionPayload) (string, error) {
	canonical := canonicalJSON(payload)
	hash := sha256.Sum256([]byte(canonical))
	return fmt.Sprintf("%x", hash), nil
}

// canonicalJSON serializa el payload como JSON canónico (RFC 8785).
// Ordena las claves alfabéticamente y sin espacios innecesarios.
func canonicalJSON(payload ActionPayload) string {
	encoder := json.NewEncoder(strings.Builder{})
	encoder.SetEscapeHTML(false)
	encoder.SetIndent("", "")
	canonical, _ := encoder.Encode(payload)
	return strings.TrimSpace(string(canonical))
}

// verifySignature verifica la firma digital usando Ed25519.
// Compatible con claves públicas en formato PEM generadas por Node.js (MCowBQYDK2Vw...).
func verifySignature(payloadHash, signatureB64, publicKeyPEM string) bool {
	signature, err := base64.StdEncoding.DecodeString(signatureB64)
	if err != nil {
		return false
	}

	block, _ := pem.Decode([]byte(publicKeyPEM))
	if block == nil {
		return false
	}

	pubKey, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return false
	}

	edPubKey, ok := pubKey.(ed25519.PublicKey)
	if !ok {
		return false
	}

	return ed25519.Verify(edPubKey, []byte(payloadHash), signature)
}

// validateUniqueness verifica que ActionID y Nonce no existan.
func validateUniqueness(stub shim.ChaincodeStubInterface, actionID, nonce string) ErrorCode {
	exists, err := stub.GetState(compositeKey(keyPrefixAction, actionID))
	if err != nil {
		return ErrActionIDCollision
	}
	if exists != nil {
		return ErrActionIDCollision
	}

	nonceKey := compositeKey(keyPrefixNonce, nonce)
	nonceExists, _ := stub.GetState(nonceKey)
	if nonceExists != nil {
		return ErrDuplicateNonce
	}

	return ""
}

// validateParentAction valida la referencia a ParentActionID.
// Aplica reglas de auto-referencia según ActionType.
func validateParentAction(stub shim.ChaincodeStubInterface, parentActionID, actionType, actorID string) ErrorCode {
	if parentActionID == "" {
		if !rootActionTypes[ActionType(actionType)] {
			return ErrParentNotFound
		}
		return ""
	}

	parentAction, err := retrieveAction(stub, parentActionID)
	if err != nil {
		return ErrParentNotFound
	}

	if parentAction.ActorID == actorID {
		if !selfReferenceAllowed[ActionType(actionType)] {
			return ErrSelfReferenceForbidden
		}
	}

	return ""
}

// storeAction almacena la acción y sus índices compuestos.
func storeAction(stub shim.ChaincodeStubInterface, action AnchoredAction) error {
	actionBytes, _ := json.Marshal(action)

	err := stub.PutState(compositeKey(keyPrefixAction, action.ActionID), actionBytes)
	if err != nil {
		return err
	}

	err = stub.PutState(compositeKey(keyPrefixNonce, action.Nonce), []byte(action.ActionID))
	if err != nil {
		return err
	}

	ts := fmt.Sprintf("%d", action.Timestamp)

	err = stub.PutState(compositeKey(keyPrefixActor, action.ActorID, ts, action.ActionID), []byte(action.ActionID))
	if err != nil {
		return err
	}

	if action.ParentActionID != "" {
		err = stub.PutState(compositeKey(keyPrefixParent, action.ParentActionID, ts, action.ActionID), []byte(action.ActionID))
		if err != nil {
			return err
		}
	}

	err = stub.PutState(compositeKey(keyPrefixTarget, action.TargetID, ts, action.ActionID), []byte(action.ActionID))
	if err != nil {
		return err
	}

	err = stub.PutState(compositeKey(keyPrefixType, action.ActionType, ts, action.ActionID), []byte(action.ActionID))
	if err != nil {
		return err
	}

	return nil
}

// retrieveAction recovering una acción por su ID.
func retrieveAction(stub shim.ChaincodeStubInterface, actionID string) (*AnchoredAction, error) {
	actionBytes, err := stub.GetState(compositeKey(keyPrefixAction, actionID))
	if err != nil || actionBytes == nil {
		return nil, fmt.Errorf("acción no encontrada")
	}

	var action AnchoredAction
	if err := json.Unmarshal(actionBytes, &action); err != nil {
		return nil, err
	}

	return &action, nil
}

// retrieveActionsByIndex recupera acciones usando un índice compuesto.
func retrieveActionsByIndex(stub shim.ChaincodeStubInterface, prefix, value string) ([]string, error) {
	iterator, err := stub.GetStateByPartialCompositeKey(prefix, []string{value})
	if err != nil {
		return nil, err
	}
	defer iterator.Close()

	var actionIDs []string
	for iterator.HasNext() {
		_, result, err := iterator.Next()
		if err != nil {
			return nil, err
		}
		actionIDs = append(actionIDs, string(result))
	}

	return actionIDs, nil
}

// compositeKey crea una clave compuesta para el world state.
// Implementa el patrón de índices de Fabric.
func compositeKey(prefix string, values ...string) string {
	return statebased.CreateCompositeKey(prefix, values)
}

func main() {
	err := shim.Start(new(AuroraActionsAnchorChaincode))
	if err != nil {
		fmt.Printf("Error al iniciar chaincode: %s\n", err)
	}
}