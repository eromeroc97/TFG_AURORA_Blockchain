import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import JsonViewer from './JsonViewer';
import type { AuditEvent } from './types';

interface EventDetailPanelProps {
  event: AuditEvent;
  onClose: () => void;
}

export default function EventDetailPanel({ event, onClose }: EventDetailPanelProps) {
  const isDiscrepancy = event.integrityStatus === 'DISCREPANCY';

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