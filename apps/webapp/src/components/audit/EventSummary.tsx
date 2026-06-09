import { ShieldCheck, ShieldX, FileText, AlertTriangle } from 'lucide-react'
import type { AuditEvent } from './types'

interface SummaryField {
  label: string
  value: string
}

const hiddenFields = new Set([
  'signature', 'publicKey', 'public_key', 'telemetryHash', 'anchorTxId', 'anchor_tx_id',
  'blockchainTxId', 'txId', '_id', '__v', 'action_id', 'ingestId', 'anchoredAt', 'anchored_at',
  'action_type', 'ecosystemId', 'nonce',
])

const fieldLabels: Record<string, string> = {
  ecosystemId: 'Ecosistema',
  ingestId: 'ID de Ingesta',
  userId: 'Usuario',
  action_type: 'Acción',
  actor_id: 'Iniciado por',
  readable_description: 'Descripción',
  target: 'Destinatario',
  target_id: 'Destinatario',
}

const actionLabels: Record<string, string> = {
  add_role: 'Añadir rol',
  remove_role: 'Eliminar rol',
  revoke_access: 'Revocar acceso',
  leave_ecosystem: 'Salir del ecosistema',
  update_role: 'Cambiar rol',
}

function truncate(val: string, max = 40): string {
  return val.length > max ? val.slice(0, max - 3) + '...' : val
}

function getSummary(event: AuditEvent): string {
  const output = event.details.blockchainRecord as Record<string, string>
  const type = event.type

  if (type === 'TELEMETRY') {
    const eco = output.ecosystemId || event.actorName
    return `Telemetría enviada por el ecosistema ${eco}`
  }

  if (type === 'ADMINISTRATIVE') {
    const actor = output.actor_id || event.actorName
    const rawAction = output.action_type || ''
    const label = actionLabels[rawAction] || rawAction
    const desc = output.readable_description || ''
    if (desc) return truncate(desc, 80)
    if (label) return `El usuario ${actor} ejecutó: ${label}`
    return `Acción administrativa ejecutada por ${actor}`
  }

  return 'Evento interno del sistema'
}

function extractFields(event: AuditEvent): SummaryField[] {
  const output = event.details.blockchainRecord as Record<string, unknown>
  const fields: SummaryField[] = []

  for (const [key, raw] of Object.entries(output)) {
    if (hiddenFields.has(key)) continue
    const val = raw == null ? '' : String(raw)
    if (!val) continue

    const label = fieldLabels[key] || key
    fields.push({ label, value: truncate(val) })
  }

  if (event.type === 'TELEMETRY' && output.ingestId) {
    fields.unshift({ label: 'ID de Ingesta', value: truncate(String(output.ingestId)) })
  }

  if (event.type === 'ADMINISTRATIVE' && output.action_type) {
    const raw = String(output.action_type)
    fields.unshift({ label: 'Acción', value: actionLabels[raw] || raw })
  }

  if (output.ecosystemId) {
    fields.unshift({ label: 'Ecosistema', value: truncate(String(output.ecosystemId)) })
  }

  return fields
}

interface EventSummaryProps {
  event: AuditEvent
}

export default function EventSummary({ event }: EventSummaryProps) {
  const isDiscrepancy = event.integrityStatus === 'DISCREPANCY'
  const summary = getSummary(event)
  const fields = extractFields(event)

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex items-center justify-center w-8 h-8 rounded-full ${
          isDiscrepancy
            ? 'bg-orange-100 text-orange-600'
            : 'bg-emerald-100 text-emerald-600'
        }`}>
          {isDiscrepancy
            ? <AlertTriangle className="w-4 h-4" />
            : <ShieldCheck className="w-4 h-4" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 leading-relaxed">
            {summary}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {event.signatureValid !== undefined && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                event.signatureValid ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {event.signatureValid ? (
                  <><ShieldCheck className="w-3 h-3" /> Firma válida</>
                ) : (
                  <><ShieldX className="w-3 h-3" /> Firma inválida</>
                )}
              </span>
            )}
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${
              isDiscrepancy ? 'text-orange-600' : 'text-emerald-600'
            }`}>
              {isDiscrepancy
                ? <><AlertTriangle className="w-3 h-3" /> Discrepancia</>
                : <><ShieldCheck className="w-3 h-3" /> Integridad verificada</>
              }
            </span>
          </div>
        </div>
      </div>

      {fields.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Datos del Evento
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {fields.map((f) => (
              <div key={f.label} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                <span className="text-slate-500 w-32 shrink-0 font-medium">
                  {f.label}
                </span>
                <span className="text-slate-900 break-all font-mono text-xs leading-relaxed">
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {event.blockchainTxId && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <FileText className="w-3.5 h-3.5" />
          <span>TX ID: <code className="font-mono">{truncate(event.blockchainTxId, 30)}</code></span>
        </div>
      )}
    </div>
  )
}
