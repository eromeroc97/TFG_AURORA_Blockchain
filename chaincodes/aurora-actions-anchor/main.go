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

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-protos-go/peer"
)

const (
	eventName        = "AuroraActionAnchored"
	keyPrefixAction  = "action"
	keyPrefixActor   = "actor"
	keyPrefixParent  = "parent"
	keyPrefixTarget  = "target"
	keyPrefixType    = "type"
	keyPrefixNonce   = "nonce"
)

// ActionType define los tipos de acciones soportadas por el chaincode.
type ActionType string

const (
	ActionTypeShareRequest    ActionType = "SHARE_REQUEST"
	ActionTypeShareAccept     ActionType = "SHARE_ACCEPT"
	ActionTypeShareReject     ActionType = "SHARE_REJECT"
	ActionTypeShareRevoke     ActionType = "SHARE_REVOKE"
	ActionTypeRequestCancel   ActionType = "REQUEST_CANCEL"
	ActionTypeRoleChange      ActionType = "ROLE_CHANGE"
	ActionTypeAccountInit     ActionType = "ACCOUNT_INIT"
	ActionTypeAccountApprove  ActionType = "ACCOUNT_APPROVE"
	ActionTypeEcosystemCreate ActionType = "ECOSYSTEM_CREATE"
)

// AnchoredAction representa una acción anclada en el ledger inmutable de Fabric.
type AnchoredAction struct {
	ActionID            string            `json:"action_id"`
	ParentActionID      string            `json:"parent_action_id"`
	ActorID             string            `json:"actor_id"`
	TargetID            string            `json:"target_id"`
	ActionType          string            `json:"action_type"`
	ReadableDescription string            `json:"readable_description"`
	PayloadHash         string            `json:"payload_hash"`
	Signature           string            `json:"signature"`
	PublicKey           string            `json:"public_key"`
	Timestamp           int64             `json:"timestamp"`
	Nonce               string            `json:"nonce"`
	Metadata            map[string]string `json:"metadata,omitempty"`
}

// ActionPayload es el contenido canónico que se firma criptográficamente.
type ActionPayload struct {
	ActionID       string `json:"action_id"`
	ActorID        string `json:"actor_id"`
	TargetID       string `json:"target_id"`
	ActionType     string `json:"action_type"`
	ParentActionID string `json:"parent_action_id,omitempty"`
	Nonce          string `json:"nonce"`
}

// TransactionInput representa la estructura recibida en la invocación del chaincode.
type TransactionInput struct {
	ActionID            string `json:"action_id"`
	ParentActionID      string `json:"parent_action_id,omitempty"`
	ActorID             string `json:"actor_id"`
	TargetID            string `json:"target_id"`
	ActionType          string `json:"action_type"`
	ReadableDescription string `json:"readable_description"`
	Signature           string `json:"signature"`
	PublicKey           string `json:"public_key"`
	Nonce               string `json:"nonce"`
}

// ErrorCode define los códigos de error específicos del chaincode.
type ErrorCode string

const (
	ErrMissingRequired        ErrorCode = "ERR_MISSING_REQUIRED"
	ErrInvalidActionType      ErrorCode = "ERR_INVALID_ACTION_TYPE"
	ErrInvalidSignature       ErrorCode = "ERR_INVALID_SIGNATURE"
	ErrActionIDCollision     ErrorCode = "ERR_ACTION_ID_COLLISION"
	ErrParentNotFound         ErrorCode = "ERR_PARENT_NOT_FOUND"
	ErrSelfReferenceForbidden ErrorCode = "ERR_SELF_REFERENCE_FORBIDDEN"
	ErrInvalidPublicKey       ErrorCode = "ERR_INVALID_PUBLIC_KEY"
	ErrDuplicateNonce         ErrorCode = "ERR_DUPLICATE_NONCE"
)

var selfReferenceAllowed = map[ActionType]bool{
	ActionTypeShareRevoke:   true,
	ActionTypeRequestCancel: true,
}

var rootActionTypes = map[ActionType]bool{
	ActionTypeShareRequest:    true,
	ActionTypeAccountInit:     true,
	ActionTypeEcosystemCreate: true,
}

type AuroraActionsAnchorChaincode struct{}

func (a *AuroraActionsAnchorChaincode) Init(stub shim.ChaincodeStubInterface) peer.Response {
	return shim.Success(nil)
}

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

func anchorAction(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	if len(args) != 1 {
		return shim.Error("Argumento inválido: se espera 1 JSON de TransactionInput")
	}

	var input TransactionInput
	if err := json.Unmarshal([]byte(args[0]), &input); err != nil {
		return shim.Error(fmt.Sprintf("Error al deserializar JSON: %s", err))
	}

	if errCode := validateInput(input); errCode != "" {
		return shim.Error(string(errCode))
	}

	if errCode := validateActionType(input.ActionType); errCode != "" {
		return shim.Error(string(errCode))
	}

	payload := ActionPayload{
		ActionID:       input.ActionID,
		ActorID:        input.ActorID,
		TargetID:       input.TargetID,
		ActionType:     input.ActionType,
		ParentActionID: input.ParentActionID,
		Nonce:          input.Nonce,
	}

	payloadHash, err := computePayloadHash(payload)
	if err != nil {
		return shim.Error(fmt.Sprintf("Error al calcular payload hash: %s", err))
	}

	if !verifySignature(payloadHash, input.Signature, input.PublicKey) {
		return shim.Error(string(ErrInvalidSignature))
	}

	if errCode := validateUniqueness(stub, input.ActionID, input.Nonce); errCode != "" {
		return shim.Error(string(errCode))
	}

	if errCode := validateParentAction(stub, input.ParentActionID, input.ActionType, input.ActorID); errCode != "" {
		return shim.Error(string(errCode))
	}

	txTimestamp, err := stub.GetTxTimestamp()
	if err != nil {
		return shim.Error("Error al obtener timestamp de transacción")
	}
	timestamp := txTimestamp.Seconds*1000 + int64(txTimestamp.Nanos)/int64(time.Millisecond)

	action := AnchoredAction{
		ActionID:            input.ActionID,
		ParentActionID:      input.ParentActionID,
		ActorID:             input.ActorID,
		TargetID:            input.TargetID,
		ActionType:          input.ActionType,
		ReadableDescription: input.ReadableDescription,
		PayloadHash:         payloadHash,
		Signature:           input.Signature,
		PublicKey:           input.PublicKey,
		Timestamp:           timestamp,
		Nonce:               input.Nonce,
	}

	if err := storeAction(stub, action); err != nil {
		return shim.Error(fmt.Sprintf("Error al almacenar acción: %s", err))
	}

	eventPayload := map[string]interface{}{
		"action_id":              action.ActionID,
		"action_type":            action.ActionType,
		"actor_id":               action.ActorID,
		"target_id":              action.TargetID,
		"parent_action_id":       action.ParentActionID,
		"timestamp":              action.Timestamp,
		"readable_description":   action.ReadableDescription,
		"payload_hash":           action.PayloadHash,
		"signature":              action.Signature,
		"tx_id":                  stub.GetTxID(),
		"block_number":           0,
		"nonce":                  action.Nonce,
		"canonical_payload_json": canonicalJSON(payload),
	}

	eventBytes, _ := json.Marshal(eventPayload)
	if err := stub.SetEvent(eventName, eventBytes); err != nil {
		return shim.Error(fmt.Sprintf("Error al emitir evento: %s", err))
	}

	return shim.Success([]byte(action.ActionID))
}

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

func getActionsByType(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	if len(args) != 1 {
		return shim.Error("Argumento inválido: se espera ActionType")
	}

	if errCode := validateActionType(args[0]); errCode != "" {
		return shim.Error(string(ErrInvalidActionType))
	}

	actionIDs, err := retrieveActionsByIndex(stub, keyPrefixType, args[0])
	if err != nil {
		return shim.Error(fmt.Sprintf("Error al consultar acciones por tipo: %s", err))
	}

	actionIDsBytes, _ := json.Marshal(actionIDs)
	return shim.Success(actionIDsBytes)
}

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

func getActionHistory(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	if len(args) != 1 {
		return shim.Error("Argumento inválido: se espera ActionID")
	}

	return shim.Success([]byte(fmt.Sprintf(`{"action_id":"%s","history_not_implemented":true}`, args[0])))
}

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

func validateActionType(actionType string) ErrorCode {
	validTypes := map[ActionType]bool{
		ActionTypeShareRequest:    true,
		ActionTypeShareAccept:     true,
		ActionTypeShareReject:     true,
		ActionTypeShareRevoke:     true,
		ActionTypeRequestCancel:   true,
		ActionTypeRoleChange:      true,
		ActionTypeAccountInit:     true,
		ActionTypeAccountApprove:  true,
		ActionTypeEcosystemCreate: true,
	}

	if !validTypes[ActionType(actionType)] {
		return ErrInvalidActionType
	}

	return ""
}

func computePayloadHash(payload ActionPayload) (string, error) {
	canonical := canonicalJSON(payload)
	hash := sha256.Sum256([]byte(canonical))
	return fmt.Sprintf("%x", hash), nil
}

func canonicalJSON(payload ActionPayload) string {
	var builder strings.Builder
	encoder := json.NewEncoder(&builder)
	encoder.SetEscapeHTML(false)
	encoder.SetIndent("", "")
	_ = encoder.Encode(payload)
	return strings.TrimSpace(builder.String())
}

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

func validateUniqueness(stub shim.ChaincodeStubInterface, actionID, nonce string) ErrorCode {
	exists, err := stub.GetState(compositeKey(stub, keyPrefixAction, actionID))
	if err != nil {
		return ErrActionIDCollision
	}
	if exists != nil {
		return ErrActionIDCollision
	}

	nonceKey := compositeKey(stub, keyPrefixNonce, nonce)
	nonceExists, _ := stub.GetState(nonceKey)
	if nonceExists != nil {
		return ErrDuplicateNonce
	}

	return ""
}

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

func storeAction(stub shim.ChaincodeStubInterface, action AnchoredAction) error {
	actionBytes, _ := json.Marshal(action)

	err := stub.PutState(compositeKey(stub, keyPrefixAction, action.ActionID), actionBytes)
	if err != nil {
		return err
	}

	err = stub.PutState(compositeKey(stub, keyPrefixNonce, action.Nonce), []byte(action.ActionID))
	if err != nil {
		return err
	}

	ts := fmt.Sprintf("%d", action.Timestamp)

	err = stub.PutState(compositeKey(stub, keyPrefixActor, action.ActorID, ts, action.ActionID), []byte(action.ActionID))
	if err != nil {
		return err
	}

	if action.ParentActionID != "" {
		err = stub.PutState(compositeKey(stub, keyPrefixParent, action.ParentActionID, ts, action.ActionID), []byte(action.ActionID))
		if err != nil {
			return err
		}
	}

	err = stub.PutState(compositeKey(stub, keyPrefixTarget, action.TargetID, ts, action.ActionID), []byte(action.ActionID))
	if err != nil {
		return err
	}

	err = stub.PutState(compositeKey(stub, keyPrefixType, action.ActionType, ts, action.ActionID), []byte(action.ActionID))
	if err != nil {
		return err
	}

	return nil
}

func retrieveAction(stub shim.ChaincodeStubInterface, actionID string) (*AnchoredAction, error) {
	actionBytes, err := stub.GetState(compositeKey(stub, keyPrefixAction, actionID))
	if err != nil || actionBytes == nil {
		return nil, fmt.Errorf("acción no encontrada")
	}

	var action AnchoredAction
	if err := json.Unmarshal(actionBytes, &action); err != nil {
		return nil, err
	}

	return &action, nil
}

func retrieveActionsByIndex(stub shim.ChaincodeStubInterface, prefix, value string) ([]string, error) {
	iterator, err := stub.GetStateByPartialCompositeKey(prefix, []string{value})
	if err != nil {
		return nil, err
	}
	defer iterator.Close()

	var actionIDs []string
	for iterator.HasNext() {
		queryRes, err := iterator.Next()
		if err != nil {
			return nil, err
		}
		actionIDs = append(actionIDs, string(queryRes.Value))
	}

	return actionIDs, nil
}

// compositeKey crea una clave compuesta nativa respetando la firma del stub de Fabric.
func compositeKey(stub shim.ChaincodeStubInterface, prefix string, values ...string) string {
	key, _ := stub.CreateCompositeKey(prefix, values)
	return key
}

func main() {
	err := shim.Start(new(AuroraActionsAnchorChaincode))
	if err != nil {
		fmt.Printf("Error al iniciar chaincode: %s\n", err)
	}
}