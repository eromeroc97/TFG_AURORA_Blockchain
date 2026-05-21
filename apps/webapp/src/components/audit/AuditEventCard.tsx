import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Server,
  FileText
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import EventDetailPanel from './EventDetailPanel';
import type { AuditEvent } from './types';

interface AuditEventCardProps {
  event: AuditEvent;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function AuditEventCard({ event, isExpanded, onToggle }: AuditEventCardProps) {
  const isVerified = event.integrityStatus === 'VERIFIED';
  const isDiscrepancy = event.integrityStatus === 'DISCREPANCY';

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeLabel = () => {
    if (event.type === 'ADMINISTRATIVE') return 'Administrativo';
    if (event.type === 'FIREFLY') return 'FireFly';
    return 'Telemetría';
  };

  const cardBackgroundColor = isExpanded
    ? isDiscrepancy ? 'rgb(255 237 213 / 0.3)' : 'rgb(241 245 249 / 0.5)'
    : 'transparent';

  const cardBorderClass = isExpanded
    ? isDiscrepancy ? 'border-orange-300' : 'border-slate-300'
    : 'border-transparent hover:border-slate-200';

  return (
    <div className="relative">
      <motion.div
        initial={false}
        animate={{ backgroundColor: cardBackgroundColor }}
        className={`group relative cursor-pointer rounded-2xl border transition-all duration-200 hover:bg-slate-50 hover:shadow-md ${cardBorderClass}`}
        onClick={onToggle}
      >
        <div className="flex items-start gap-4 p-4">
          <div className="flex flex-col items-center">
            <div
              className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                isVerified
                  ? 'bg-emerald-100 text-emerald-600 border-emerald-500'
                  : 'bg-orange-100 text-orange-600 border-orange-500 animate-pulse'
              }`}
            >
              {isVerified ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div className="w-0.5 h-full bg-slate-200 absolute top-10 left-1/2 -translate-x-1/2" />
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {getTypeLabel()}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-400">
                {formatDate(event.timestamp)}
              </span>
            </div>
            
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              {event.action}
            </h3>
            
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm text-slate-600 truncate max-w-[200px]">
                  {event.actorName}
                </span>
              </div>
              <StatusBadge status={event.integrityStatus} />
            </div>
          </div>

          <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-4 ml-14">
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
              <FileText className="w-3.5 h-3.5" />
              <span>ID: <code className="font-mono">{event.eventId}</code></span>
            </div>
          </div>
        )}
      </motion.div>

      {isExpanded && (
        <div className="ml-14">
          <EventDetailPanel 
            event={event} 
            onClose={onToggle} 
          />
        </div>
      )}
    </div>
  );
}