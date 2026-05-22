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
  const cleanStr = paramStr.replace(/(?:\/\*[\s\S]*?\*\/|\/\/.*$)/gm, '').trim()
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
function skipSpaces(code: string, cursor: number, len: number): number {
  while (cursor < len) {
    const char = code[cursor]
    if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') break
    cursor++
  }
  return cursor
}

function skipLineComment(code: string, cursor: number, len: number): number {
  cursor += 2
  while (cursor < len && code[cursor] !== '\n') cursor++
  return cursor
}

function skipBlockComment(code: string, cursor: number, len: number): number {
  cursor += 2
  while (cursor < len && !(code[cursor] === '*' && code[cursor + 1] === '/')) cursor++
  return cursor + 2
}

function skipWhitespaceAndComments(code: string, cursor: number, len: number): number {
  let pos = cursor
  while (pos < len) {
    const char = code[pos]
    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      pos++
      continue
    }
    if (char === '/' && code[pos + 1] === '/') {
      pos = skipLineComment(code, pos, len)
      continue
    }
    if (char === '/' && code[pos + 1] === '*') {
      pos = skipBlockComment(code, pos, len)
      continue
    }
    break
  }
  return pos
}

function matchKeyword(code: string, cursor: number, len: number, kw: string): { matched: boolean; cursor: number } {
  const pos = skipWhitespaceAndComments(code, cursor, len)
  if (code.startsWith(kw, pos)) {
    const nextChar = code[pos + kw.length]
    if (!nextChar || /[\s([{]/.test(nextChar)) {
      return { matched: true, cursor: pos + kw.length }
    }
  }
  return { matched: false, cursor: pos }
}

function readUntil(code: string, cursor: number, len: number, target: string): { value: string; cursor: number } {
  const start = cursor
  let depth = 0
  let pos = cursor
  const isParen = target === ')'

  while (pos < len) {
    if (isParen && code[pos] === '(') {
      depth++
    } else if (code[pos] === target) {
      if (depth === 0) {
        return { value: code.substring(start, pos), cursor: pos + 1 }
      }
      depth--
    }
    pos++
  }
  return { value: '', cursor: pos }
}

function readIdentifier(code: string, cursor: number, len: number): { value: string; cursor: number } {
  const pos = skipWhitespaceAndComments(code, cursor, len)
  const start = pos
  let p = pos
  while (p < len && /[a-zA-Z0-9_]/.test(code[p])) p++
  return { value: code.substring(start, p), cursor: p }
}

function tryParseMethod(code: string, cursor: number, len: number): { method: FireFlyMethod | null; cursor: number } {
  const kw = matchKeyword(code, cursor, len, 'func')
  if (!kw.matched) return { method: null, cursor: cursor + 1 }

  let pos = skipWhitespaceAndComments(code, kw.cursor, len)
  if (code[pos] !== '(') return { method: null, cursor: pos }

  pos++
  const receiver = readUntil(code, pos, len, ')')
  if (!receiver.value.includes('*')) return { method: null, cursor: receiver.cursor }

  pos = receiver.cursor
  const ident = readIdentifier(code, pos, len)
  if (!ident.value) return { method: null, cursor: ident.cursor }
  const firstCharUpper = ident.value.charAt(0).toUpperCase()
  if (!ident.value.startsWith(firstCharUpper)) return { method: null, cursor: ident.cursor }

  pos = skipWhitespaceAndComments(code, ident.cursor, len)
  if (code[pos] !== '(') return { method: null, cursor: pos }

  pos++
  const paramsBlock = readUntil(code, pos, len, ')')
  const params = parseParameterBlock(paramsBlock.value)

  return { method: { name: ident.value, params }, cursor: paramsBlock.cursor }
}

export function parseGoCodeToFFI(code: string): FireFlyFFI {
  if (!detectContractAPI(code)) {
    throw new ContractAPIError(
      'El código fuente no usa el estilo Contract API (contractapi.Contract). El parser solo es compatible con chaincodes que implementan contractapi.Contract.',
    )
  }

  const methods: FireFlyMethod[] = []
  let cursor = 0
  const len = code.length

  while (cursor < len) {
    const result = tryParseMethod(code, cursor, len)
    if (result.method) {
      methods.push(result.method)
    }
    cursor = result.cursor
  }

  return {
    name: 'auto-generated-interface',
    version: '1.0',
    methods,
  }
}