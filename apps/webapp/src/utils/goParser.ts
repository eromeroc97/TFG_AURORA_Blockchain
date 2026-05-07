import type { FireFlyFFI, FireFlyMethod, FireFlyParam } from '../types/ffi.types'

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

const CTX_KW = ['TransactionContext', 'TransactionContextInterface']

function toJsonType(go: string): string {
  return GO_TYPE_MAP[go.toLowerCase()] || 'string'
}

function isCtx(arg: string): boolean {
  return CTX_KW.some(k => arg.includes(k))
}

function parseParams(argsRaw: string): FireFlyParam[] {
  const res: FireFlyParam[] = []
  if (!argsRaw.trim()) return res

  const parts = argsRaw.split(',').map(s => s.trim()).filter(Boolean)
  let lastGoType = ''

  for (const part of parts) {
    const tokens = part.split(/\s+/).filter(Boolean)
    if (!tokens.length) continue
    
    if (tokens.length >= 2) {
      const names = tokens.slice(0, -1)
      const goType = tokens[tokens.length - 1]
      if (isCtx(goType) || names.some(n => isCtx(n))) {
        if (!isCtx(goType)) {
          names.forEach(n => res.push({ name: n, type: toJsonType(goType), schema: { type: toJsonType(goType) } }))
        }
        lastGoType = goType
        continue
      }
      lastGoType = goType
      names.forEach(n => res.push({ name: n, type: toJsonType(goType), schema: { type: toJsonType(goType) } }))
    } else if (tokens.length === 1 && lastGoType) {
      res.push({ name: tokens[0], type: toJsonType(lastGoType), schema: { type: toJsonType(lastGoType) } })
    }
  }

  return res
}

export function parseGoCodeToFFI(code: string): FireFlyFFI {
  const methods: FireFlyMethod[] = []

  const funcs = code.matchAll(/func\s+\(\s*\w+\s+\*\w+\)\s+(\w+)\s*\(([^)]+)\)\s*(?:error)?/g)
  
  for (const match of funcs) {
    const methodName = match[1]
    const paramsRaw = match[2] || ''
    const params = parseParams(paramsRaw)

    if (params.length > 0) {
      methods.push({ name: methodName, params })
    }
  }

  return {
    name: 'auto-generated-interface',
    version: '1.0',
    methods,
  }
}