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

const CODE_WITH_POINTERS_AND_SLICES = `
package main

type AssetContract struct {}

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

type CommentContract struct {}

// Public method with leading comment
func (s *CommentContract) DocumentedMethod(ctx context.Context, value string) error {
	// inline comment inside body
	return nil
}

// UndocumentedMethod should also be parsed
func (s *CommentContract) UndocumentedMethod(ctx context.Context, id int) string {
	return "result"
}

/* Block comment before method */
func (s *CommentContract) BlockCommentMethod(ctx context.Context) error {
	return nil
}

// This line has func in it like myfunction and also in strings "func()"
// but these should not be detected as keywords
func (s *CommentContract) IgnoreFalsePositives(ctx context.Context) error {
	return nil
}
`

const CODE_WITH_COMPLEX_TYPES = `
package main

type ComplexContract struct {}

func (s *ComplexContract) MapParam(ctx context.Context, data map[string]int) error {
	return nil
}

func (s *ComplexContract) InterfaceParam(ctx context.Context, reader io.Reader) error {
	return nil
}

func (s *ComplexContract) VariadicParam(ctx context.Context, ids ...string) error {
	return nil
}

func (s *ComplexContract) EmptyReturn(ctx context.Context) {
	// void method
}
`

const CODE_WITH_PRIVATE_METHODS = `
package main

type MixedContract struct {}

func (s *MixedContract) PublicMethod(ctx context.Context) error {
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

type EmptyContract struct {}

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

type NestedContract struct {}

func (s *NestedContract) DeepMethod(ctx context.Context, input struct{ A int }) error {
	return nil
}

func (s *NestedContract) PointerToSlice(ctx context.Context, items *[]Item) error {
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
        const result = parseGoCodeToFFI('package main\nfunc privateFunc() {}')

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

      it('should handle methods with no return values', () => {
        const result = parseGoCodeToFFI(CODE_WITH_COMPLEX_TYPES)

        const emptyReturn = result.methods.find(m => m.name === 'EmptyReturn')
        expect(emptyReturn).toBeDefined()
        expect(emptyReturn?.params).toHaveLength(1)
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
type MyContract struct {}
func (s MyContract) ValueReceiverMethod(ctx context.Context) error { return nil }
func (s *MyContract) PointerReceiverMethod(ctx context.Context) error { return nil }
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
type WeirdContract struct {}
func   (s   *WeirdContract)   SpacedMethod   (  ctx   context.Context   )   error   {
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
type Contract struct {}
func (s *Contract) GroupedParams(ctx context.Context, a, b, c string, x, y int) error {
  return nil
}
`)

        const method = result.methods[0]
        expect(method.params).toHaveLength(6)
        expect(method.params.map(p => p.name)).toEqual(['ctx', 'a', 'b', 'c', 'x', 'y'])
        expect(method.params[1].type).toBe('string')
        expect(method.params[4].type).toBe('integer')
      })

      it('should handle single parameter correctly', () => {
        const result = parseGoCodeToFFI(`
package main
type Contract struct {}
func (s *Contract) SingleParam(ctx context.Context, id string) error {
  return nil
}
`)

        expect(result.methods[0].params).toHaveLength(2)
        expect(result.methods[0].params[0].name).toBe('ctx')
        expect(result.methods[0].params[1].name).toBe('id')
        expect(result.methods[0].params[1].type).toBe('string')
      })
    })

    describe('edge case: func in different contexts', () => {
      it('should match func as keyword and include public methods', () => {
        const result = parseGoCodeToFFI(`
package main
type Contract struct {}
func (s *Contract) MyFunc() error { return nil }
func (s *Contract) FunctionName(ctx context.Context) error { return nil }
func (s *Contract) NotAFunction(ctx context.Context) error { return nil }
`)

        expect(result.methods.map(m => m.name)).toContain('MyFunc')
        expect(result.methods.map(m => m.name)).toContain('FunctionName')
        expect(result.methods.map(m => m.name)).toContain('NotAFunction')
      })

      it('should handle func followed by square brackets', () => {
        const result = parseGoCodeToFFI(`
package main
type Contract struct {}
func (s *Contract) BracketsMethod(ctx context.Context, data []byte) error {
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
          methods.push(`func (s *T) Method${i}(ctx context.Context, v string) error { return nil }`)
        }
        const largeCode = `package main\ntype T struct {}\n${methods.join('\n')}`

        const result = parseGoCodeToFFI(largeCode)
        expect(result.methods).toHaveLength(100)
      })

      it('should handle empty input gracefully', () => {
        const result = parseGoCodeToFFI('')
        expect(result.methods).toHaveLength(0)
      })

      it('should handle only whitespace gracefully', () => {
        const result = parseGoCodeToFFI('   \n\t\n   ')
        expect(result.methods).toHaveLength(0)
      })

      it('should handle code with only imports and types', () => {
        const result = parseGoCodeToFFI(`
package main
import "fmt"
type MyStruct struct {
  Field string
}
`)
        expect(result.methods).toHaveLength(0)
      })
    })
  })
})