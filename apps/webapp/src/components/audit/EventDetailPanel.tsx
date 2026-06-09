import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Eye, EyeOff } from 'lucide-react';
import JsonViewer from './JsonViewer';
import EventSummary from './EventSummary';
import type { AuditEvent } from './types';

interface EventDetailPanelProps {
  event: AuditEvent;
  userRole?: string;
  onClose: () => void;
}

export default function EventDetailPanel({ event, userRole, onClose }: EventDetailPanelProps) {
  const isDiscrepancy = event.integrityStatus === 'DISCREPANCY';
  const [showTechnical, setShowTechnical] = useState(false);

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
              Detalle del Evento
            </span>
            {isDiscrepancy && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-200 px-2 py-0.5 text-xs font-medium text-orange-800">
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

        <div className="p-4">
          <EventSummary event={event} />

          {userRole !== 'AUDITOR' && (
            <div className="mt-4 pt-3 border-t border-slate-200/50">
              <button
                onClick={() => setShowTechnical(!showTechnical)}
                className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                {showTechnical ? (
                  <><EyeOff className="w-3.5 h-3.5" /> Ocultar datos técnicos</>
                ) : (
                  <><Eye className="w-3.5 h-3.5" /> Ver datos técnicos</>
                )}
              </button>

              {showTechnical && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <JsonViewer
                    data={event.details.blockchainRecord}
                    title="Registro Blockchain"
                  />
                  <JsonViewer
                    data={event.details.databaseRecord}
                    title="Registro en Base de Datos"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}