import { parseGoCodeToFFI } from './goParser'

const SAMPLE_GO_CODE = `
package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type TelemetryAnchor struct {
	IngestID      string \`json:"ingestId"\`
	EcosystemID   string \`json:"ecosystemId"\`
	TelemetryHash string \`json:"telemetryHash"\`
}

type TelemetryAnchorSmartContract struct {
	contractapi.Contract
}

func (s *TelemetryAnchorSmartContract) AnchorTelemetry(ctx contractapi.TransactionContextInterface, ingestId string, ecosystemId string, telemetryHash string, signature string, publicKey string) error {
	if ingestId == "" {
		return fmt.Errorf("ingestId es obligatorio")
	}
	return nil
}

func (s *TelemetryAnchorSmartContract) QueryByIngestID(ctx contractapi.TransactionContextInterface, ingestId string) (*TelemetryAnchor, error) {
	return nil, nil
}

func (s *TelemetryAnchorSmartContract) QueryByHash(ctx contractapi.TransactionContextInterface, telemetryHash string) ([]*TelemetryAnchor, error) {
	return nil, nil
}

func (s *TelemetryAnchorSmartContract) QueryByEcosystem(ctx contractapi.TransactionContextInterface, ecosystemId string, startTime string, endTime string) ([]*TelemetryAnchor, error) {
	return nil, nil
}
`

const CODE_WITH_GROUPED_PARAMS = `
package main

type SmartContract struct {}

func (s *SmartContract) CreateAsset(ctx contractapi.TransactionContextInterface, id, name, owner string, value int) error {
	return nil
}
`

describe('goParser', () => {
  describe('parseGoCodeToFFI', () => {
    it('should parse basic methods and ignore context parameter', () => {
      const result = parseGoCodeToFFI(SAMPLE_GO_CODE)

      expect(result.name).toBe('auto-generated-interface')
      expect(result.version).toBe('1.0')
      expect(result.methods).toHaveLength(4)
      expect(result.methods[0].name).toBe('AnchorTelemetry')
      expect(result.methods[0].params).toHaveLength(5)
      expect(result.methods[0].params.map(p => p.name)).toEqual(['ingestId', 'ecosystemId', 'telemetryHash', 'signature', 'publicKey'])
    })

    it('should map Go types to JSON Schema types', () => {
      const result = parseGoCodeToFFI(CODE_WITH_GROUPED_PARAMS)

      expect(result.methods[0].params.map(p => p.type)).toEqual(['string', 'string', 'string', 'integer'])
    })

    it('should return empty methods array for code with no public methods', () => {
      const result = parseGoCodeToFFI('package main\nfunc privateFunc() {}')

      expect(result.methods).toHaveLength(0)
    })
  })
})