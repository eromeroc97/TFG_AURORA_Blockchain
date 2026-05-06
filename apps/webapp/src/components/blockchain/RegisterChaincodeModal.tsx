import { useState } from 'react'
import { FileCode, Loader2, X } from 'lucide-react'
import { registerChaincode } from '../../services/blockchain.service'

interface RegisterChaincodeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function RegisterChaincodeModal({
  isOpen,
  onClose,
  onSuccess,
}: RegisterChaincodeModalProps) {
  const [apiName, setApiName] = useState('')
  const [channel, setChannel] = useState('firefly')
  const [chaincodeName, setChaincodeName] = useState('')
  const [ffiJson, setFfiJson] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const resetForm = () => {
    setApiName('')
    setChannel('firefly')
    setChaincodeName('')
    setFfiJson('')
    setError(null)
    setSuccess(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await registerChaincode({
        apiName: apiName.trim(),
        channel: channel.trim(),
        chaincodeName: chaincodeName.trim(),
        ffiJson: ffiJson.trim(),
      })
      setSuccess(true)
      onSuccess?.()
      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el chaincode')
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid =
    apiName.trim() &&
    channel.trim() &&
    chaincodeName.trim() &&
    ffiJson.trim() &&
    !error

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <FileCode className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Registrar Chaincode</h3>
              <p className="text-sm text-slate-500">
                Vincula un chaincode instalado en la red Hyperledger Fabric
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Nombre de la API Lógica
            </label>
            <input
              type="text"
              value={apiName}
              onChange={(e) => setApiName(e.target.value)}
              placeholder="ej. aurora-telemetry-api"
              className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Nombre del Canal de Fabric
            </label>
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="ej. firefly"
              className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Nombre del Chaincode Físico
            </label>
            <input
              type="text"
              value={chaincodeName}
              onChange={(e) => setChaincodeName(e.target.value)}
              placeholder="ej. aurora-telemetry-anchor"
              className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              JSON de la Interfaz (FFI)
            </label>
            <textarea
              value={ffiJson}
              onChange={(e) => setFfiJson(e.target.value)}
              placeholder='{"name": "...", "version": "...", "methods": [...]}'
              rows={8}
              className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-accent font-mono"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm text-emerald-700">
                Chaincode registrado correctamente
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:bg-emerald-600/60 disabled:hover:bg-emerald-600/60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}