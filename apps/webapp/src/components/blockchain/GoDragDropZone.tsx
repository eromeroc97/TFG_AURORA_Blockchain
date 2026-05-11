import { useState, useRef } from 'react'
import { Upload, FileCode, AlertCircle } from 'lucide-react'
import { parseGoCodeToFFI, ContractAPIError } from '../../utils/goParser'

interface GoDragDropZoneProps {
  onJsonGenerated: (jsonString: string) => void
}

export default function GoDragDropZone({ onJsonGenerated }: GoDragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setError(null)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.name.endsWith('.go')) {
        try {
          const content = await file.text()
          const ffi = parseGoCodeToFFI(content)
          onJsonGenerated(JSON.stringify(ffi, null, 2))
        } catch (err) {
          if (err instanceof ContractAPIError) {
            setError(
              'El smart contract no utiliza el estilo Contract API de Hyperledger Fabric. Para generar la interfaz FFI automáticamente, el código debe implementar contractapi.Contract. Si desea continuar, puede crear manualmente el JSON de registro en FireFly.',
            )
          } else {
            setError('Error al procesar el archivo')
          }
        }
      } else {
        setError('Solo se admiten archivos .go')
      }
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.name.endsWith('.go')) {
        try {
          const content = await file.text()
          const ffi = parseGoCodeToFFI(content)
          onJsonGenerated(JSON.stringify(ffi, null, 2))
        } catch (err) {
          if (err instanceof ContractAPIError) {
            setError(
              'El smart contract no utiliza el estilo Contract API de Hyperledger Fabric. Para generar la interfaz FFI automáticamente, el código debe implementar contractapi.Contract. Si desea continuar, puede crear manualmente el JSON de registro en FireFly.',
            )
          } else {
            setError('Error al procesar el archivo')
          }
        }
      } else {
        setError('Solo se admiten archivos .go')
      }
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all
          ${isDragging
            ? 'border-accent bg-accent/5'
            : 'border-slate-300 hover:border-accent hover:bg-slate-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".go"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          <div className={`flex size-12 items-center justify-center rounded-full ${isDragging ? 'bg-accent/10' : 'bg-slate-100'}`}>
            {isDragging ? (
              <FileCode className="size-6 text-accent" />
            ) : (
              <Upload className="size-6 text-slate-400" />
            )}
          </div>
          <div>
            <p className="font-medium text-slate-700">
              {isDragging ? 'Suelta el archivo' : 'Arrastra un archivo .go aquí'}
            </p>
            <p className="text-sm text-slate-500">o haz clic para seleccionar</p>
          </div>
        </div>
      </div>
      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-rose-600">
          <AlertCircle className="size-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}