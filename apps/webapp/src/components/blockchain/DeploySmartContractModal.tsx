import { useState } from 'react'
import { FileArchive, Loader2, Upload, X } from 'lucide-react'
import Select from '../Select'
import type { DeploySmartContractRequest } from '../../services/blockchain.service'

interface DeploySmartContractModalProps {
  isOpen: boolean
  onClose: () => void
  onDeploy: (data: DeploySmartContractRequest) => Promise<void>
  isLoading: boolean
}

const CHANNELS = [
  { value: 'default', label: 'default' },
  { value: 'firefly', label: 'firefly' },
] as const

export default function DeploySmartContractModal({
  isOpen,
  onClose,
  onDeploy,
  isLoading,
}: DeploySmartContractModalProps) {
  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [channel, setChannel] = useState('default')
  const [packageFile, setPackageFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const resetForm = () => {
    setName('')
    setVersion('')
    setChannel('default')
    setPackageFile(null)
    setFileError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleFileChange = (file: File) => {
    setFileError(null)
    if (!file.name.endsWith('.tar.gz')) {
      setFileError('El archivo debe ser un .tar.gz')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError('El archivo no puede superar 5MB')
      return
    }
    setPackageFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileChange(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !version.trim() || !packageFile) return

    await onDeploy({
      name: name.trim(),
      version: version.trim(),
      channel,
      package: packageFile,
    })
  }

  const isFormValid = name.trim() && version.trim() && packageFile && !fileError

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <FileArchive className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Desplegar Smart Contract</h3>
              <p className="text-sm text-slate-500">
                Sube un archivo .tar.gz con el paquete de Fabric
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
            <label className="block text-sm font-medium text-slate-700">Nombre del Chaincode</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. iot-telemetry-cc"
              className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Versión</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="ej. 1.0.0"
              className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Canal</label>
            <Select
              value={channel}
              onChange={(value) => setChannel(value)}
              options={CHANNELS.map((c) => ({ value: c.value, label: c.label }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Paquete (.tar.gz)</label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-6 transition-colors ${
                dragOver
                  ? 'border-accent bg-accent/5'
                  : fileError
                    ? 'border-rose-300 bg-rose-50'
                    : packageFile
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-border hover:border-accent'
              }`}
            >
              {packageFile ? (
                <div className="flex flex-col items-center gap-2">
                  <FileArchive className="size-8 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">{packageFile.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setPackageFile(null)
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cambiar archivo
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="size-8 text-slate-400" />
                  <span className="mt-2 text-sm text-slate-600">
                    Arrastra el archivo aquí o
                  </span>
                  <label className="cursor-pointer text-sm font-medium text-accent hover:text-accent/80">
                    buscar en equipo
                    <input
                      type="file"
                      accept=".tar.gz"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileChange(file)
                      }}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>
            {fileError && (
              <p className="mt-1 text-xs text-rose-600">{fileError}</p>
            )}
          </div>

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
              className="inline-flex items-center justify-center rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Desplegando...
                </>
              ) : (
                'Desplegar Smart Contract'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}