import { parseGoCodeToFFI, ContractAPIError } from './goParser'

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

import (
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SmartContract struct {
	contractapi.Contract
}

func (s *SmartContract) CreateAsset(ctx contractapi.TransactionContextInterface, id, name, owner string, value int) error {
	return nil
}
`

const CODE_WITH_POINTERS_AND_SLICES = `
package main

import (
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type AssetContract struct {
	contractapi.Contract
}

func (s *AssetContract) UpdateAsset(ctx context.Context, id string, data *AssetData, tags []string) error {
	return nil
}

func (s *AssetContract) GetAssets(ctx context.Context, filter string) ([]*Asset, error) {
	return nil, nil
}

func (s *AssetContract) ProcessBatch(ctx context.Context, ids []string, data [10]byte) (int, error) {
	return 0, nil
}
`

const CODE_WITH_COMMENTS = `
package main

import (
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type CommentContract struct {
	contractapi.Contract
}

// Public method with leading comment
func (s *CommentContract) DocumentedMethod(ctx contractapi.TransactionContextInterface, value string) error {
	// inline comment inside body
	return nil
}

// UndocumentedMethod should also be parsed
func (s *CommentContract) UndocumentedMethod(ctx contractapi.TransactionContextInterface, id int) string {
	return "result"
}

/* Block comment before method */
func (s *CommentContract) BlockCommentMethod(ctx contractapi.TransactionContextInterface) error {
	return nil
}

// This line has func in it like myfunction and also in strings "func()"
// but these should not be detected as keywords
func (s *CommentContract) IgnoreFalsePositives(ctx contractapi.TransactionContextInterface) error {
	return nil
}
`

const CODE_WITH_COMPLEX_TYPES = `
package main

import (
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type ComplexContract struct {
	contractapi.Contract
}

func (s *ComplexContract) MapParam(ctx contractapi.TransactionContextInterface, data map[string]int) error {
	return nil
}

func (s *ComplexContract) InterfaceParam(ctx contractapi.TransactionContextInterface, reader io.Reader) error {
	return nil
}

func (s *ComplexContract) VariadicParam(ctx contractapi.TransactionContextInterface, ids ...string) error {
	return nil
}

func (s *ComplexContract) EmptyReturn(ctx contractapi.TransactionContextInterface) {
	// void method
}
`

const CODE_WITH_PRIVATE_METHODS = `
package main

import (
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type MixedContract struct {
	contractapi.Contract
}

func (s *MixedContract) PublicMethod(ctx contractapi.TransactionContextInterface) error {
	return nil
}

func (s *MixedContract) publicMethod(ctx context.Context) error {
	return nil
}

func (s *MixedContract) AnotherPublic(ctx context.Context, value int) string {
	return ""
}

func privateFunction() {
	// standalone function, not a method
}
`

const CODE_WITH_EMPTY_AND_WEIRD = `
package main

import (
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type EmptyContract struct {
	contractapi.Contract
}

type WeirdContract struct {
	contractapi.Contract
}

func (s *EmptyContract)() error {
	return nil
}

func (s *EmptyContract) NoParams() error {
	return nil
}

func (s *WeirdContract) Whatever() error {
	return nil
}
`

const CODE_WITH_NESTED_STRUCTS = `
package main

import (
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type NestedContract struct {
	contractapi.Contract
}

func (s *NestedContract) DeepMethod(ctx contractapi.TransactionContextInterface, input struct{ A int }) error {
	return nil
}

func (s *NestedContract) PointerToSlice(ctx contractapi.TransactionContextInterface, items *[]Item) error {
	return nil
}
`

describe('goParser', () => {
  describe('parseGoCodeToFFI', () => {
    describe('basic parsing', () => {
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
        const result = parseGoCodeToFFI(`
package main

import (
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type Contract struct {
	contractapi.Contract
}

func privateFunc() {}
`)

        expect(result.methods).toHaveLength(0)
      })
    })

    describe('type mapping', () => {
      it('should map pointers *Type to string', () => {
        const result = parseGoCodeToFFI(CODE_WITH_POINTERS_AND_SLICES)

        const updateAsset = result.methods.find(m => m.name === 'UpdateAsset')
        expect(updateAsset).toBeDefined()
        expect(updateAsset?.params.find(p => p.name === 'data')?.type).toBe('string')
      })

      it('should map slices []Type to string', () => {
        const result = parseGoCodeToFFI(CODE_WITH_POINTERS_AND_SLICES)

        const getAssets = result.methods.find(m => m.name === 'GetAssets')
        expect(getAssets).toBeDefined()
        expect(getAssets?.params.find(p => p.name === 'filter')?.type).toBe('string')
      })

      it('should map arrays [n]Type to string', () => {
        const result = parseGoCodeToFFI(CODE_WITH_POINTERS_AND_SLICES)

        const processBatch = result.methods.find(m => m.name === 'ProcessBatch')
        expect(processBatch).toBeDefined()
        expect(processBatch?.params.find(p => p.name === 'data')?.type).toBe('string')
      })

      it('should map map[K]V to string', () => {
        const result = parseGoCodeToFFI(CODE_WITH_COMPLEX_TYPES)

        const mapParam = result.methods.find(m => m.name === 'MapParam')
        expect(mapParam).toBeDefined()
        expect(mapParam?.params.find(p => p.name === 'data')?.type).toBe('string')
      })

      it('should map interface types to string', () => {
        const result = parseGoCodeToFFI(CODE_WITH_COMPLEX_TYPES)

        const interfaceParam = result.methods.find(m => m.name === 'InterfaceParam')
        expect(interfaceParam).toBeDefined()
        expect(interfaceParam?.params.find(p => p.name === 'reader')?.type).toBe('string')
      })

      it('should handle variadic parameters', () => {
        const result = parseGoCodeToFFI(CODE_WITH_COMPLEX_TYPES)

        const variadic = result.methods.find(m => m.name === 'VariadicParam')
        expect(variadic).toBeDefined()
        expect(variadic?.params.find(p => p.name === 'ids')?.type).toBe('string')
      })

      it('should handle methods with return values', () => {
        const result = parseGoCodeToFFI(CODE_WITH_COMPLEX_TYPES)

        expect(result.methods.map(m => m.name)).toContain('MapParam')
        expect(result.methods.map(m => m.name)).toContain('InterfaceParam')
        expect(result.methods.map(m => m.name)).toContain('VariadicParam')
      })
    })

    describe('comment handling', () => {
      it('should parse methods despite having comments in code', () => {
        const result = parseGoCodeToFFI(CODE_WITH_COMMENTS)

        expect(result.methods.map(m => m.name)).toContain('DocumentedMethod')
        expect(result.methods.map(m => m.name)).toContain('UndocumentedMethod')
        expect(result.methods.map(m => m.name)).toContain('BlockCommentMethod')
      })

      it('should not match func inside strings or comments as keywords', () => {
        const result = parseGoCodeToFFI(CODE_WITH_COMMENTS)

        expect(result.methods.find(m => m.name === 'IgnoreFalsePositives')).toBeDefined()
      })
    })

    describe('method filtering', () => {
      it('should only include public methods (starting with uppercase)', () => {
        const result = parseGoCodeToFFI(CODE_WITH_PRIVATE_METHODS)

        expect(result.methods.map(m => m.name)).toEqual(['PublicMethod', 'AnotherPublic'])
      })

      it('should skip standalone functions (not methods)', () => {
        const result = parseGoCodeToFFI(CODE_WITH_PRIVATE_METHODS)

        expect(result.methods).toHaveLength(2)
        expect(result.methods.find(m => m.name === 'privateFunction')).toBeUndefined()
      })

      it('should skip methods with non-pointer receivers', () => {
        const code = `
package main

import (
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type MyContract struct {
	contractapi.Contract
}

func (s MyContract) ValueReceiverMethod(ctx contractapi.TransactionContextInterface) error { return nil }
func (s *MyContract) PointerReceiverMethod(ctx contractapi.TransactionContextInterface) error { return nil }
`
        const result = parseGoCodeToFFI(code)

        expect(result.methods.map(m => m.name)).toEqual(['PointerReceiverMethod'])
      })
    })

    describe('edge cases', () => {
      it('should handle empty parameter list', () => {
        const result = parseGoCodeToFFI(CODE_WITH_EMPTY_AND_WEIRD)

        const noParams = result.methods.find(m => m.name === 'NoParams')
        expect(noParams).toBeDefined()
        expect(noParams?.params).toHaveLength(0)
      })

      it('should handle methods with weird spacing', () => {
        const result = parseGoCodeToFFI(`
package main

import (
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type WeirdContract struct {
	contractapi.Contract
}

func   (s   *WeirdContract)   SpacedMethod   (  ctx   contractapi.TransactionContextInterface   )   error   {
  return   nil
}
`)

        expect(result.methods.find(m => m.name === 'SpacedMethod')).toBeDefined()
      })

      it('should handle nested struct types', () => {
        const result = parseGoCodeToFFI(CODE_WITH_NESTED_STRUCTS)

        const deepMethod = result.methods.find(m => m.name === 'DeepMethod')
        expect(deepMethod).toBeDefined()
        expect(deepMethod?.params.find(p => p.name === 'input')?.type).toBe('string')
      })
    })

    describe('parameter grouping', () => {
      it('should correctly group multiple names with single type', () => {
        const result = parseGoCodeToFFI(`
package main

import (
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type Contract struct {
	contractapi.Contract
}

func (s *Contract) GroupedParams(ctx contractapi.TransactionContextInterface, a, b, c string, x, y int) error {
  return nil
}
`)

        const method = result.methods[0]
        expect(method.params).toHaveLength(5)
        expect(method.params.map(p => p.name)).toEqual(['a', 'b', 'c', 'x', 'y'])
        expect(method.params[0].type).toBe('string')
        expect(method.params[3].type).toBe('integer')
      })

      it('should handle single parameter correctly', () => {
        const result = parseGoCodeToFFI(`
package main

import (
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type Contract struct {
	contractapi.Contract
}

func (s *Contract) SingleParam(ctx contractapi.TransactionContextInterface, id string) error {
  return nil
}
`)

        expect(result.methods[0].params).toHaveLength(1)
        expect(result.methods[0].params[0].name).toBe('id')
        expect(result.methods[0].params[0].type).toBe('string')
      })
    })

    describe('edge case: func in different contexts', () => {
      it('should match func as keyword and include public methods', () => {
        const result = parseGoCodeToFFI(`
package main

import (
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type Contract struct {
	contractapi.Contract
}

func (s *Contract) MyFunc() error { return nil }
func (s *Contract) FunctionName(ctx contractapi.TransactionContextInterface) error { return nil }
func (s *Contract) NotAFunction(ctx contractapi.TransactionContextInterface) error { return nil }
`)

        expect(result.methods.map(m => m.name)).toContain('MyFunc')
        expect(result.methods.map(m => m.name)).toContain('FunctionName')
        expect(result.methods.map(m => m.name)).toContain('NotAFunction')
      })

      it('should handle func followed by square brackets', () => {
        const result = parseGoCodeToFFI(`
package main

import (
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type Contract struct {
	contractapi.Contract
}

func (s *Contract) BracketsMethod(ctx contractapi.TransactionContextInterface, data []byte) error {
  return nil
}
`)

        expect(result.methods.find(m => m.name === 'BracketsMethod')).toBeDefined()
      })
    })

    describe('performance and robustness', () => {
      it('should handle large files without hanging', () => {
        const methods: string[] = []
        for (let i = 0; i < 100; i++) {
          methods.push(`func (s *T) Method${i}(ctx contractapi.TransactionContextInterface, v string) error { return nil }`)
        }
        const largeCode = `package main

import (
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type T struct {
	contractapi.Contract
}

${methods.join('\n')}`

        const result = parseGoCodeToFFI(largeCode)
        expect(result.methods).toHaveLength(100)
      })

      it('should throw ContractAPIError for empty input', () => {
        expect(() => parseGoCodeToFFI('')).toThrow(ContractAPIError)
        expect(() => parseGoCodeToFFI('')).toThrow(/Contract API/)
      })

      it('should throw ContractAPIError for whitespace only', () => {
        expect(() => parseGoCodeToFFI('   \n\t\n   ')).toThrow(ContractAPIError)
        expect(() => parseGoCodeToFFI('   \n\t\n   ')).toThrow(/Contract API/)
      })

      it('should throw ContractAPIError for code without Contract API', () => {
        expect(() => parseGoCodeToFFI(`
package main
import "fmt"
type MyStruct struct {
  Field string
}
`)).toThrow(ContractAPIError)
        expect(() => parseGoCodeToFFI(`
package main
import "fmt"
type MyStruct struct {
  Field string
}
`)).toThrow(/Contract API/)
      })
    })
  })

  describe('Contract API detection', () => {
    it('should throw ContractAPIError when code does not use Contract API', () => {
      const shimStyleCode = `
package main

import (
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-protos-go/peer"
)

type MyChaincode struct{}

func (c *MyChaincode) Invoke(stub shim.ChaincodeStubInterface) peer.Response {
	return shim.Success(nil)
}

func main() {
	shim.Start(new(MyChaincode))
}
`
      expect(() => parseGoCodeToFFI(shimStyleCode)).toThrow(ContractAPIError)
      expect(() => parseGoCodeToFFI(shimStyleCode)).toThrow(/Contract API/)
    })

    it('should throw ContractAPIError for plain Go code without contractapi import', () => {
      const plainCode = `
package main

func main() {
	println("Hello")
}
`
      expect(() => parseGoCodeToFFI(plainCode)).toThrow(ContractAPIError)
      expect(() => parseGoCodeToFFI(plainCode)).toThrow(/Contract API/)
    })

    it('should parse Contract API style without errors', () => {
      const contractApiCode = `
package main

import (
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type MyContract struct {
	contractapi.Contract
}

func (s *MyContract) MyMethod(ctx contractapi.TransactionContextInterface, value string) error {
	return nil
}

func main() {
	chaincode, _ := contractapi.NewChaincode(&MyContract{})
	chaincode.Start()
}
`
      const result = parseGoCodeToFFI(contractApiCode)
      expect(result.methods).toHaveLength(1)
      expect(result.methods[0].name).toBe('MyMethod')
    })
  })
})