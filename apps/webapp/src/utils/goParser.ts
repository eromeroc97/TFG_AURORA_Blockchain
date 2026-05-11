import type { FireFlyFFI, FireFlyMethod, FireFlyParam } from '../types/ffi.types'

export class ContractAPIError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContractAPIError'
  }
}

const GO_TYPE_MAP: Record<string, string> = {
  string: 'string',
  int: 'integer',
  int32: 'integer',
  int64: 'integer',
  uint: 'integer',
  uint32: 'integer',
  uint64: 'integer',
  float32: 'number',
  float64: 'number',
  bool: 'boolean',
}

const CTX_KW = ['TransactionContext', 'TransactionContextInterface', 'ChaincodeStubInterface']
const CONTRACT_API_IMPORT = 'contractapi.Contract'

function toJsonType(go: string): string {
  return GO_TYPE_MAP[go.toLowerCase()] || 'string'
}

function isCtx(arg: string): boolean {
  return CTX_KW.some(k => arg.includes(k))
}

function detectContractAPI(code: string): boolean {
  return code.includes(CONTRACT_API_IMPORT)
}

// Representa un parámetro extraído antes de expandir agrupaciones
interface RawParam {
  names: string[]
  type: string
}

/**
 * Analizador léxico que extrae estrictamente el bloque de parámetros dentro de los paréntesis
 * de una firma de función, ignorando saltos de línea y comentarios.
 */
function parseParameterBlock(paramStr: string): FireFlyParam[] {
  const params: FireFlyParam[] = []
  const rawParams: RawParam[] = []
  
  // Limpiar comentarios en línea o de bloque dentro de la firma (poco probable, pero robusto)
  const cleanStr = paramStr.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').trim()
  if (!cleanStr) return params

  const segments = cleanStr.split(',')
  let currentNames: string[] = []

  for (const segment of segments) {
    const tokens = segment.trim().split(/\s+/).filter(Boolean)
    if (tokens.length === 0) continue

    if (tokens.length >= 2) {
      // Caso normal o final de agrupación: ej. "ctx TransactionContextInterface" o "a, b string"
      const typeStr = tokens.pop()! // El último token es el tipo
      const segmentNames = tokens   // Los anteriores son nombres
      
      currentNames.push(...segmentNames)
      rawParams.push({ names: currentNames, type: typeStr })
      currentNames = [] // Reiniciar el acumulador para el siguiente tipo
    } else if (tokens.length === 1) {
      // Si solo hay un token, pueden ocurrir dos cosas en Go:
      // 1. Es un nombre agrupado que compartirá el tipo posterior (ej. "a" en "a, b string")
      // 2. Es un tipo sin nombre (ej. en interfaces o retornos, aunque en Contract API se suelen nombrar)
      currentNames.push(tokens[0])
    }
  }

  // Si quedó un identificador colgado al final, se asume como tipo genérico
  if (currentNames.length > 0) {
    rawParams.push({ names: ['input'], type: currentNames[0] })
  }

  // Procesar y mapear a la estructura de FireFly, descartando los contextos del SDK
  for (const rp of rawParams) {
    const goType = rp.type.replace(/^\[\]/, '') // Limpiar punteros a slices si los hubiera
    
    // Comprobar si el tipo o alguno de los nombres hace referencia al contexto de Fabric
    const isContext = isCtx(rp.type) || rp.names.some(n => isCtx(n))
    
    if (isContext) {
      // Si por error de nombrado el tipo no era contexto pero el nombre sí, no emitir
      continue
    }

    const mappedType = toJsonType(goType)
    for (const name of rp.names) {
      params.push({
        name,
        type: mappedType,
        schema: { type: mappedType }
      })
    }
  }

  return params
}

/**
 * Escáner de código que implementa una máquina de estados para evadir el uso de regex.
 * Busca firmas de métodos públicos asociados a un receptor (Contract API).
 */
export function parseGoCodeToFFI(code: string): FireFlyFFI {
  if (!detectContractAPI(code)) {
    throw new ContractAPIError(
      'El código fuente no usa el estilo Contract API (contractapi.Contract). El parser solo es compatible con chaincodes que implementan contractapi.Contract.',
    )
  }

  const methods: FireFlyMethod[] = []
  
  let cursor = 0
  const len = code.length

  function skipWhitespaceAndComments() {
    while (cursor < len) {
      const char = code[cursor]
      if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
        cursor++
      } else if (char === '/' && code[cursor + 1] === '/') {
        // Comentario de línea
        cursor += 2
        while (cursor < len && code[cursor] !== '\n') cursor++
      } else if (char === '/' && code[cursor + 1] === '*') {
        // Comentario de bloque
        cursor += 2
        while (cursor < len && !(code[cursor] === '*' && code[cursor + 1] === '/')) {
          cursor++
        }
        cursor += 2
      } else {
        break
      }
    }
  }

  function matchKeyword(kw: string): boolean {
    skipWhitespaceAndComments()
    if (code.startsWith(kw, cursor)) {
      // Asegurar que es una palabra completa (el siguiente carácter debe ser espacio o delimitador)
      const nextChar = code[cursor + kw.length]
      if (!nextChar || /[\s([{]/.test(nextChar)) {
        cursor += kw.length
        return true
      }
    }
    return false
  }

  function readUntil(target: string): string {
    const start = cursor
    let depth = 0 // Manejar anidamientos si buscamos cierres de paréntesis
    const isParen = target === ')'

    while (cursor < len) {
      if (isParen && code[cursor] === '(') {
        depth++
      } else if (code[cursor] === target) {
        if (depth === 0) {
          const result = code.substring(start, cursor)
          cursor++ // Consumir el carácter objetivo
          return result
        } else {
          depth--
        }
      }
      cursor++
    }
    return ''
  }

  function readIdentifier(): string {
    skipWhitespaceAndComments()
    const start = cursor
    while (cursor < len && /[a-zA-Z0-9_]/.test(code[cursor])) {
      cursor++
    }
    return code.substring(start, cursor)
  }

  // Bucle principal de escaneo
  while (cursor < len) {
    if (matchKeyword('func')) {
      skipWhitespaceAndComments()
      
      // Comprobar si es un método receptor: debe abrir paréntesis inmediatamente
      if (code[cursor] === '(') {
        cursor++ // Consumir '('
        const receiverBlock = readUntil(')')
        
        // Validar que el receptor sea un puntero a estructura (ej. "s *TelemetryAnchorSmartContract")
        if (receiverBlock.includes('*')) {
          const methodName = readIdentifier()
          
          // Asegurar que el método empieza por mayúscula (es público/exportado en Go)
          if (methodName && methodName[0] === methodName[0].toUpperCase()) {
            skipWhitespaceAndComments()
            
            if (code[cursor] === '(') {
              cursor++ // Consumir '(' de los argumentos
              const paramsBlock = readUntil(')')
              
              const params = parseParameterBlock(paramsBlock)
              methods.push({ name: methodName, params })
            }
          }
        }
      }
    } else {
      cursor++
    }
  }

  return {
    name: 'auto-generated-interface',
    version: '1.0',
    methods,
  }
}