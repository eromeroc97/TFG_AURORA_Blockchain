import { FileSearch } from 'lucide-react'

export default function AuditDashboardPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <FileSearch className="h-6 w-6 text-teal-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Auditoría Blockchain</h1>
              <p className="text-slate-600 mt-2">
                Consulta y verifica los anclajes de telemetría en el ledger.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-500 text-center py-12">
            Dashboard de auditoría en construcción. Define los componentes que necesitas.
          </p>
        </div>
      </div>
    </div>
  )
}