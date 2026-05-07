import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ShieldCheck, ShieldX, Info } from 'lucide-react';
import JsonViewer from './JsonViewer';
import type { AuditEvent } from './types';

interface EventDetailPanelProps {
  event: AuditEvent;
  onClose: () => void;
}

function IntegrityInfoModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ml-1 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 left-0 top-6 w-72 p-3 bg-white rounded-lg shadow-lg border border-slate-200"
          >
            <div className="text-xs font-medium text-slate-700 mb-2">
              ¿Cómo se verifica la integridad?
            </div>
            <div className="text-xs text-slate-600 space-y-2">
              <p>
                <span className="font-medium">1. Relación de datos:</span> El evento de FireFly contiene <code className="bg-slate-100 px-1 rounded">ingestId</code>, que se corresponde con <code className="bg-slate-100 px-1 rounded">metadata.telemetryId</code> en MongoDB.
              </p>
              <p>
                <span className="font-medium">2. Verificación de hash:</span> Se recalcula el hash SHA-256 del payload en MongoDB (payload + coordenadas GPS) y se compara con el <code className="bg-slate-100 px-1 rounded">telemetryHash</code> almacenado en la blockchain.
              </p>
              <p>
                <span className="font-medium">3. Resultado:</span> Si los hashes coinciden, los datos son íntegros. Si difieren, hay una discrepancia que indica posible manipulación.
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SignatureInfoModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ml-1 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 left-0 top-6 w-72 p-3 bg-white rounded-lg shadow-lg border border-slate-200"
          >
            <div className="text-xs font-medium text-slate-700 mb-2">
              ¿Cómo se verifica la firma?
            </div>
            <div className="text-xs text-slate-600 space-y-2">
              <p>
                <span className="font-medium">1. Datos Firmados:</span> El hash de telemetría (<code className="bg-slate-100 px-1 rounded">telemetryHash</code>) fue firmado criptográficamente por el dispositivo emisor usando su clave privada.
              </p>
              <p>
                <span className="font-medium">2. Clave Pública:</span> Cada evento contiene la <code className="bg-slate-100 px-1 rounded">publicKey</code> del dispositivo en formato PEM, usada para verificar la firma sin revelar la clave privada.
              </p>
              <p>
                <span className="font-medium">3. Verificación:</span> Se usa criptografía asimétrica (Ed25519) para verificar que la <code className="bg-slate-100 px-1 rounded">signature</code> coincide con el hash y fue creada por el dispositivo poseedor de la clave privada correspondiente.
              </p>
              <p>
                <span className="font-medium">4. Resultado:</span> Si la verificación es exitosa, la firma es válida y el evento fue generado por el dispositivo legítimo. Si falla, la firma es inválida o los datos fueron alterados.
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EventDetailPanel({ event, onClose }: EventDetailPanelProps) {
  const isDiscrepancy = event.integrityStatus === 'DISCREPANCY';
  
  const blockchainRecord = event.details.blockchainRecord as Record<string, unknown>;
  const hasSignatureData = !!blockchainRecord.signature && !!blockchainRecord.publicKey;
  const signatureValid = event.signatureValid;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`mt-4 rounded-2xl border overflow-hidden ${
          isDiscrepancy
            ? 'bg-orange-50/50 border-orange-200'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">
              Inspección de Evento
            </span>
            {isDiscrepancy && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-200 px-2 py-0.5 text-xs font-medium text-orange-800">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Discrepancia Detectada
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {hasSignatureData && (
          <div className="px-4 py-3 border-b border-slate-200/50 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Verificación de Firma:</span>
              <SignatureInfoModal />
              {signatureValid === true ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <ShieldCheck className="w-3 h-3" />
                  Firma válida
                </span>
              ) : signatureValid === false ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  <ShieldX className="w-3 h-3" />
                  Firma inválida
                </span>
              ) : (
                <span className="text-xs text-slate-400">Sin datos</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Verificación de Integridad:</span>
              <IntegrityInfoModal />
              {event.integrityStatus === 'VERIFIED' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <ShieldCheck className="w-3 h-3" />
                  Datos íntegros
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  <ShieldX className="w-3 h-3" />
                  Discrepancia
                </span>
              )}
            </div>
          </div>
        )}

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <JsonViewer
              data={event.details.blockchainRecord}
              title="Registro Blockchain (Inmutable)"
            />
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              TX ID: <code className="font-mono text-xs">{event.blockchainTxId}</code>
            </div>
          </div>

          <div>
            <JsonViewer
              data={event.details.databaseRecord}
              title="Estado Actual (Base de Datos)"
            />
            {isDiscrepancy && (
              <div className="mt-3 p-3 rounded-lg bg-orange-100 border border-orange-200">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-medium text-orange-800">Análisis de Discrepancia</p>
                    <p className="text-orange-700 mt-1">
                      Los datos entre la blockchain y la base de datos no coinciden. 
                      Esto puede indicar una inconsistencia en el sistema o un intento de manipulación.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}