package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type ActionType string

const (
	ActionTypeAccountInit        ActionType = "ACCOUNT_INIT"
	ActionTypeAccountApprove    ActionType = "ACCOUNT_APPROVE"
	ActionTypeRoleChange        ActionType = "ROLE_CHANGE"
	ActionTypeAccountRevoke     ActionType = "ACCOUNT_REVOKE"
	ActionTypeAccountPassblock  ActionType = "ACCOUNT_PASSBLOCK"

	ActionTypeEcosystemCreate       ActionType = "ECOSYSTEM_CREATE"
	ActionTypeEcosystemUpdate       ActionType = "ECOSYSTEM_UPDATE"
	ActionTypeEcosystemRevoke       ActionType = "ECOSYSTEM_REVOKE"
	ActionTypeEcosystemLeave        ActionType = "ECOSYSTEM_LEAVE"
	ActionTypeEcosystemAccessGrant  ActionType = "ECOSYSTEM_ACCESS_GRANT"
	ActionTypeEcosystemAccessAccept ActionType = "ECOSYSTEM_ACCESS_ACCEPT"
	ActionTypeEcosystemAccessReject  ActionType = "ECOSYSTEM_ACCESS_REJECT"
	ActionTypeEcosystemAccessRevoke  ActionType = "ECOSYSTEM_ACCESS_REVOKE"
	ActionTypeEcosystemAccessUpdate  ActionType = "ECOSYSTEM_ACCESS_UPDATE"

	ActionTypeDeviceRegister ActionType = "DEVICE_REGISTER"
	ActionTypeDeviceUpdate   ActionType = "DEVICE_UPDATE"
	ActionTypeDeviceRemove   ActionType = "DEVICE_REMOVE"

	ActionTypeAuthLogin          ActionType = "AUTH_LOGIN"
	ActionTypeAuthLogout         ActionType = "AUTH_LOGOUT"
	ActionTypeAuthSessionRevoke  ActionType = "AUTH_SESSION_REVOKE"

	ActionTypeNotificationSent ActionType = "NOTIFICATION_SENT"
	ActionTypeNotificationRead ActionType = "NOTIFICATION_READ"
)

var ValidActionTypes = map[ActionType]bool{
	ActionTypeAccountInit:        true,
	ActionTypeAccountApprove:    true,
	ActionTypeRoleChange:        true,
	ActionTypeAccountRevoke:     true,
	ActionTypeAccountPassblock:  true,
	ActionTypeEcosystemCreate:       true,
	ActionTypeEcosystemUpdate:       true,
	ActionTypeEcosystemRevoke:       true,
	ActionTypeEcosystemLeave:        true,
	ActionTypeEcosystemAccessGrant:  true,
	ActionTypeEcosystemAccessAccept: true,
	ActionTypeEcosystemAccessReject: true,
	ActionTypeEcosystemAccessRevoke: true,
	ActionTypeEcosystemAccessUpdate: true,
	ActionTypeDeviceRegister: true,
	ActionTypeDeviceUpdate:   true,
	ActionTypeDeviceRemove:   true,
	ActionTypeAuthLogin:     true,
	ActionTypeAuthLogout:    true,
	ActionTypeAuthSessionRevoke: true,
	ActionTypeNotificationSent: true,
	ActionTypeNotificationRead: true,
}

func IsValidActionType(at ActionType) bool {
	return ValidActionTypes[at]
}

type AuroraActionAnchor struct {
	ActionID            string            `json:"action_id"`
	ActorID             string            `json:"actor_id"`
	TargetID            string            `json:"target_id"`
	ActionType          string            `json:"action_type"`
	ParentActionID      string            `json:"parent_action_id,omitempty"`
	ReadableDescription string            `json:"readable_description"`
	Signature           string            `json:"signature"`
	PublicKey           string            `json:"public_key"`
	Nonce               string            `json:"nonce"`
	Metadata            map[string]string `json:"metadata,omitempty"`
	AnchorTxID          string            `json:"anchor_tx_id"`
	AnchoredAt          string            `json:"anchored_at"`
}

type AuroraActionAnchorContract struct {
	contractapi.Contract
}

func (s *AuroraActionAnchorContract) AnchorAction(
	ctx contractapi.TransactionContextInterface,
	actionID string,
	actorID string,
	targetID string,
	actionType string,
	parentActionID string,
	readableDescription string,
	signature string,
	publicKey string,
	nonce string,
	metadataJSON string,
) error {
	if strings.TrimSpace(actionID) == "" {
		return fmt.Errorf("actionID es obligatorio")
	}
	if strings.TrimSpace(actorID) == "" {
		return fmt.Errorf("actorID es obligatorio")
	}
	if strings.TrimSpace(targetID) == "" {
		return fmt.Errorf("targetID es obligatorio")
	}
	if strings.TrimSpace(actionType) == "" {
		return fmt.Errorf("actionType es obligatorio")
	}
	if strings.TrimSpace(readableDescription) == "" {
		return fmt.Errorf("readableDescription es obligatorio")
	}
	if strings.TrimSpace(signature) == "" {
		return fmt.Errorf("signature es obligatorio")
	}
	if strings.TrimSpace(publicKey) == "" {
		return fmt.Errorf("publicKey es obligatorio")
	}
	if strings.TrimSpace(nonce) == "" {
		return fmt.Errorf("nonce es obligatorio")
	}

	if !IsValidActionType(ActionType(actionType)) {
		return fmt.Errorf("actionType no valido: %s", actionType)
	}

	if len(readableDescription) > 2048 {
		return fmt.Errorf("readableDescription excede 2048 caracteres")
	}

	if len(metadataJSON) > 4096 {
		return fmt.Errorf("metadataJSON excede 4096 caracteres")
	}

	var metadata map[string]string
	if strings.TrimSpace(metadataJSON) != "" && metadataJSON != "{}" {
		if err := json.Unmarshal([]byte(metadataJSON), &metadata); err != nil {
			return fmt.Errorf("metadataJSON no es JSON valido: %v", err)
		}
	} else {
		metadata = make(map[string]string)
	}

	existing, err := ctx.GetStub().GetState(actionID)
	if err != nil {
		return fmt.Errorf("error al verificar accion existente: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("accion duplicada: %s", actionID)
	}

	nonceKey, _ := ctx.GetStub().CreateCompositeKey("nonce", []string{nonce})
	nonceExists, err := ctx.GetStub().GetState(nonceKey)
	if err != nil {
		return fmt.Errorf("error al verificar nonce: %v", err)
	}
	if nonceExists != nil {
		return fmt.Errorf("nonce duplicado: %s", nonce)
	}

	if parentActionID != "" {
		parent, err := ctx.GetStub().GetState(parentActionID)
		if err != nil {
			return fmt.Errorf("error al verificar accion padre: %v", err)
		}
		if parent == nil {
			return fmt.Errorf("accion padre no encontrada: %s", parentActionID)
		}
	}

	txID := ctx.GetStub().GetTxID()
	now := time.Now().UTC().Format(time.RFC3339)

	anchor := AuroraActionAnchor{
		ActionID:            actionID,
		ActorID:             actorID,
		TargetID:            targetID,
		ActionType:          actionType,
		ParentActionID:      parentActionID,
		ReadableDescription:  readableDescription,
		Signature:           signature,
		PublicKey:           publicKey,
		Nonce:               nonce,
		Metadata:            metadata,
		AnchorTxID:          txID,
		AnchoredAt:          now,
	}

	anchorJSON, err := json.Marshal(anchor)
	if err != nil {
		return fmt.Errorf("error al serializar accion: %v", err)
	}

	if err := ctx.GetStub().PutState(actionID, anchorJSON); err != nil {
		return fmt.Errorf("error al guardar accion: %v", err)
	}

	nonceIndexKey, _ := ctx.GetStub().CreateCompositeKey("nonce", []string{nonce})
	if err := ctx.GetStub().PutState(nonceIndexKey, []byte{0x00}); err != nil {
		return fmt.Errorf("error al indexar nonce: %v", err)
	}

	actorIndexKey, _ := ctx.GetStub().CreateCompositeKey("actor", []string{actorID, now, actionID})
	if err := ctx.GetStub().PutState(actorIndexKey, []byte{0x00}); err != nil {
		return fmt.Errorf("error al indexar por actor: %v", err)
	}

	typeIndexKey, _ := ctx.GetStub().CreateCompositeKey("type", []string{actionType, now, actionID})
	if err := ctx.GetStub().PutState(typeIndexKey, []byte{0x00}); err != nil {
		return fmt.Errorf("error al indexar por tipo: %v", err)
	}

	targetIndexKey, _ := ctx.GetStub().CreateCompositeKey("target", []string{targetID, now, actionID})
	if err := ctx.GetStub().PutState(targetIndexKey, []byte{0x00}); err != nil {
		return fmt.Errorf("error al indexar por target: %v", err)
	}

	if parentActionID != "" {
		parentIndexKey, _ := ctx.GetStub().CreateCompositeKey("parent", []string{parentActionID, now, actionID})
		if err := ctx.GetStub().PutState(parentIndexKey, []byte{0x00}); err != nil {
			return fmt.Errorf("error al indexar por padre: %v", err)
		}
	}

	if err := ctx.GetStub().SetEvent("ActionAnchored", anchorJSON); err != nil {
		return fmt.Errorf("error al emitir evento: %v", err)
	}

	return nil
}

func (s *AuroraActionAnchorContract) GetAction(ctx contractapi.TransactionContextInterface, actionID string) (*AuroraActionAnchor, error) {
	anchorJSON, err := ctx.GetStub().GetState(actionID)
	if err != nil {
		return nil, fmt.Errorf("error al leer del world state: %v", err)
	}
	if anchorJSON == nil {
		return nil, fmt.Errorf("accion no encontrada: %s", actionID)
	}

	var anchor AuroraActionAnchor
	if err := json.Unmarshal(anchorJSON, &anchor); err != nil {
		return nil, fmt.Errorf("error al deserializar accion: %v", err)
	}

	return &anchor, nil
}

func (s *AuroraActionAnchorContract) GetActionsByActor(ctx contractapi.TransactionContextInterface, actorID string) ([]*AuroraActionAnchor, error) {
	return s.queryByIndex(ctx, "actor", []string{actorID})
}

func (s *AuroraActionAnchorContract) GetActionsByActorAndType(ctx contractapi.TransactionContextInterface, actorID string, actionType string) ([]*AuroraActionAnchor, error) {
	allByActor, err := s.GetActionsByActor(ctx, actorID)
	if err != nil {
		return nil, err
	}

	var filtered []*AuroraActionAnchor
	for _, a := range allByActor {
		if a.ActionType == actionType {
			filtered = append(filtered, a)
		}
	}
	return filtered, nil
}

func (s *AuroraActionAnchorContract) GetActionsByActorAndTypeAndTarget(ctx contractapi.TransactionContextInterface, actorID string, actionType string, targetID string) ([]*AuroraActionAnchor, error) {
	allByActor, err := s.GetActionsByActor(ctx, actorID)
	if err != nil {
		return nil, err
	}

	var filtered []*AuroraActionAnchor
	for _, a := range allByActor {
		if a.ActionType == actionType && a.TargetID == targetID {
			filtered = append(filtered, a)
		}
	}
	return filtered, nil
}

func (s *AuroraActionAnchorContract) GetActionsByType(ctx contractapi.TransactionContextInterface, actionType string) ([]*AuroraActionAnchor, error) {
	return s.queryByIndex(ctx, "type", []string{actionType})
}

func (s *AuroraActionAnchorContract) GetActionsByTarget(ctx contractapi.TransactionContextInterface, targetID string) ([]*AuroraActionAnchor, error) {
	return s.queryByIndex(ctx, "target", []string{targetID})
}

func (s *AuroraActionAnchorContract) GetActionChildren(ctx contractapi.TransactionContextInterface, parentActionID string) ([]*AuroraActionAnchor, error) {
	return s.queryByIndex(ctx, "parent", []string{parentActionID})
}

func (s *AuroraActionAnchorContract) queryByIndex(ctx contractapi.TransactionContextInterface, indexName string, indexValues []string) ([]*AuroraActionAnchor, error) {
	iterator, err := ctx.GetStub().GetStateByPartialCompositeKey(indexName, indexValues)
	if err != nil {
		return nil, fmt.Errorf("error al obtener iterador de indice %s: %v", indexName, err)
	}
	defer iterator.Close()

	actionIDs := make(map[string]bool)
	for iterator.HasNext() {
		response, err := iterator.Next()
		if err != nil {
			continue
		}
		_, parts, err := ctx.GetStub().SplitCompositeKey(response.Key)
		if err != nil {
			continue
		}
		if len(parts) >= 3 {
			actionIDs[parts[len(parts)-1]] = true
		}
	}

	var anchors []*AuroraActionAnchor
	for actionID := range actionIDs {
		anchor, err := s.GetAction(ctx, actionID)
		if err != nil {
			continue
		}
		anchors = append(anchors, anchor)
	}
	return anchors, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&AuroraActionAnchorContract{})
	if err != nil {
		panic(fmt.Sprintf("Error al crear el chaincode AuroraActionAnchor: %v", err))
	}

	if err := chaincode.Start(); err != nil {
		panic(fmt.Sprintf("Error al iniciar el chaincode: %v", err))
	}
}
