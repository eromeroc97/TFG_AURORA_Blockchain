import { useState } from 'react'
import { Copy, Check, X, Info } from 'lucide-react'

interface DeploymentHelpModalProps {
  className?: string
}

export default function DeploymentHelpModal({ className }: DeploymentHelpModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const commands = [
    { text: 'go mod tidy\ngo mod vendor', step: 1 },
    { text: `docker run --rm -v $PWD:/workspace -w /workspace hyperledger/fabric-tools:2.4 \\
  peer lifecycle chaincode package mi-contrato-pkg.tgz \\
  --path ./ \\
  --lang golang \\
  --label mi-chaincode_1.0`, step: 2 },
    { text: 'ff deploy fabric <nombre_de_tu_stack> mi-contrato-pkg.tgz firefly <nombre_del_chaincode> 1.0', step: 3 },
  ]

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors ${className || ''}`}
      >
        <Info className="size-4" />
        ¿Cómo despliego un Smart Contract?
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          <div className="relative z-10 w-[80vw] max-h-[90vh] overflow-hidden rounded-3xl bg-white p-6 shadow-2xl flex flex-col">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-5" />
            </button>

            <h2 className="text-xl font-bold text-slate-900">Guía de Despliegue de Chaincodes (CLI)</h2>
            
            <div className="mt-4 space-y-6 overflow-y-auto flex-1">
              <p className="text-sm text-slate-600">
                Antes de registrar la API en este panel, el chaincode debe estar empaquetado e instalado en los nodos de Fabric por el equipo de Sistemas.
              </p>

              <div>
                <h3 className="text-lg font-semibold text-slate-900">Paso 1: Preparar las dependencias (Go)</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Abre tu terminal en la carpeta raíz del chaincode y descarga las dependencias de Go:
                </p>
                <div className="relative mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(commands[0].text, 0)}
                    className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-300 transition-colors"
                  >
                    {copiedIndex === 0 ? (
                      <>
                        <Check className="size-3" />
                        ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        Copiar
                      </>
                    )}
                  </button>
                  <pre className="text-sm font-mono text-slate-700 whitespace-pre-wrap">
                    <code>{commands[0].text}</code>
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900">Paso 2: Empaquetar el Código (Docker)</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Usa el contenedor oficial de Fabric Tools para compilar y generar el archivo .tgz:
                </p>
                <div className="relative mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(commands[1].text, 1)}
                    className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-300 transition-colors"
                  >
                    {copiedIndex === 1 ? (
                      <>
                        <Check className="size-3" />
                        ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        Copiar
                      </>
                    )}
                  </button>
                  <pre className="text-sm font-mono text-slate-700 whitespace-pre-wrap">
                    <code>{commands[1].text}</code>
                  </pre>
                </div>
                <p className="mt-2 text-sm font-medium text-rose-600">
                  ⚠️ Importante: El parámetro --label DEBE ser obligatoriamente el nombre del contrato seguido de un guion bajo y la versión.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900">Paso 3: Desplegar con FireFly CLI</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Envía el paquete generado a tu red local ejecutando:
                </p>
                <div className="relative mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(commands[2].text, 2)}
                    className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-300 transition-colors"
                  >
                    {copiedIndex === 2 ? (
                      <>
                        <Check className="size-3" />
                        ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        Copiar
                      </>
                    )}
                  </button>
                  <pre className="text-sm font-mono text-slate-700 whitespace-pre-wrap">
                    <code>{commands[2].text}</code>
                  </pre>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-slate-700">
                  Una vez que el comando termine sin errores, puedes cerrar esta ventana y usar el formulario principal para registrar la interfaz JSON.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}