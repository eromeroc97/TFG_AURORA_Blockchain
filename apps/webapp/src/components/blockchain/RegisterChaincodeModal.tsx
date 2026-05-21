import { useState, useEffect } from 'react'
import { FileCode, Loader2, X, Lock } from 'lucide-react'
import { registerChaincode, type SmartContract } from '../../services/blockchain.service'
import GoDragDropZone from './GoDragDropZone'

interface RegisterChaincodeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  initialContract?: SmartContract
}

export default function RegisterChaincodeModal({
  isOpen,
  onClose,
  onSuccess,
  initialContract,
}: RegisterChaincodeModalProps) {
  const isUpgrade = !!initialContract

  const [apiName, setApiName] = useState('')
  const [channel, setChannel] = useState('firefly')
  const [chaincodeName, setChaincodeName] = useState('')
  const [ffiJson, setFfiJson] = useState('')
  const [eventName, setEventName] = useState('')
  const [topic, setTopic] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (isUpgrade && initialContract) {
        setApiName(initialContract.name)
        setChannel(initialContract.channel)
        setChaincodeName(initialContract.name)
        setFfiJson('')
        setEventName('')
        setTopic('')
      } else {
        setApiName('')
        setChannel('firefly')
        setChaincodeName('')
        setFfiJson('')
        setEventName('')
        setTopic('')
      }
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, isUpgrade, initialContract])

  const handleClose = () => {
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
        eventName: eventName.trim() || undefined,
        topic: topic.trim() || undefined,
      })
      setSuccess(true)
      onSuccess?.()
      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el chaincode')
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = (() => {
    if (!apiName.trim() || !channel.trim() || !chaincodeName.trim()) return false
    if (!ffiJson.trim()) return false
    if (isUpgrade) return true
    return true
  })()

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
              <h3 className="text-lg font-semibold text-slate-900">
                {isUpgrade ? 'Actualizar Smart Contract' : 'Registrar Smart Contract'}
              </h3>
              <p className="text-sm text-slate-500">
                {isUpgrade
                  ? `Actualizando ${initialContract?.name}`
                  : 'Vincula un chaincode instalado en la red Hyperledger Fabric'}
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
            <label htmlFor="api-name" className="block text-sm font-medium text-slate-700">
              Nombre de la API Lógica
            </label>
            {isUpgrade ? (
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
                <Lock className="size-4" />
                {apiName}
              </div>
            ) : (
              <input
                id="api-name"
                type="text"
                value={apiName}
                onChange={(e) => setApiName(e.target.value)}
                placeholder="ej. aurora-telemetry-api"
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-accent"
              />
            )}
          </div>

          <div>
            <label htmlFor="fabric-channel" className="block text-sm font-medium text-slate-700">
              Nombre del Canal de Fabric
            </label>
            {isUpgrade ? (
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
                <Lock className="size-4" />
                {channel}
              </div>
            ) : (
              <input
                id="fabric-channel"
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="ej. firefly"
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-accent"
              />
            )}
          </div>

          <div>
            <label htmlFor="chaincode-name" className="block text-sm font-medium text-slate-700">
              Nombre del Chaincode Físico
            </label>
            {isUpgrade ? (
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
                <Lock className="size-4" />
                {chaincodeName}
              </div>
            ) : (
              <input
                id="chaincode-name"
                type="text"
                value={chaincodeName}
                onChange={(e) => setChaincodeName(e.target.value)}
                placeholder="ej. aurora-telemetry-anchor"
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-accent"
              />
            )}
          </div>

          {isUpgrade && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-700">
                Se registrará una nueva versión de la interfaz (FFI). El canal y nombre del chaincode no cambiarán.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="event-name" className="block text-sm font-medium text-slate-700">
              Nombre del Evento <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              id="event-name"
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="ej. ActionAnchored, TelemetryAnchored"
              className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-accent"
            />
            <p className="mt-1 text-xs text-slate-400">
              Nombre del evento que emite el chaincode. Se creará un listener para escucharlo.
            </p>
          </div>

          <div>
            <label htmlFor="ffi-topic" className="block text-sm font-medium text-slate-700">
              Topic <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              id="ffi-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="ej. auditoria-iot"
              className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-accent"
            />
            <p className="mt-1 text-xs text-slate-400">
              Tópico de FireFly para el listener de eventos.
            </p>
          </div>

          <div>
            <label htmlFor="ffi-json" className="block text-sm font-medium text-slate-700">
              JSON de la Interfaz (FFI) <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1">
              <GoDragDropZone
                onJsonGenerated={(jsonString) => setFfiJson(jsonString)}
              />
            </div>
            <textarea
              id="ffi-json"
              value={ffiJson}
              onChange={(e) => setFfiJson(e.target.value)}
              placeholder='{"name": "...", "version": "...", "methods": [...]}'
              rows={8}
              className="mt-2 w-full rounded-xl border border-border px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-accent font-mono"
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
                {isUpgrade ? 'Smart Contract actualizado correctamente' : 'Chaincode registrado correctamente'}
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
                  {isUpgrade ? 'Actualizando...' : 'Registrando...'}
                </>
              ) : isUpgrade ? (
                'Actualizar'
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