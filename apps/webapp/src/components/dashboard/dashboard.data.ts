/**
 * Alerta de seguridad del dashboard.
 */
export type SecurityAlert = {
	/** ID único de la alerta */
	id: string;
	/** ID del ecosistema afectado */
	ecosystemId: string;
	/** Título de la alerta */
	title: string;
	/** Nivel de severidad */
	level: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Datos de alertas de seguridad (mock para desarrollo).
 */
export const SECURITY_ALERTS_MOCK: SecurityAlert[] = [
  {
    id: 'alert-001',
    ecosystemId: 'eco-001',
    title: 'Movimiento inusual detectado',
    level: 'medium',
  },
  {
    id: 'alert-002',
    ecosystemId: 'eco-001',
    title: 'Umbral térmico superado',
    level: 'high',
  },
  {
    id: 'alert-003',
    ecosystemId: 'eco-002',
    title: 'Intento de acceso no autorizado',
    level: 'critical',
  },
  {
    id: 'alert-004',
    ecosystemId: 'eco-003',
    title: 'Consumo energético irregular',
    level: 'medium',
  },
  {
    id: 'alert-005',
    ecosystemId: 'eco-004',
    title: 'Puerta abierta fuera de horario',
    level: 'low',
  },
  {
    id: 'alert-006',
    ecosystemId: 'eco-004',
    title: 'Variación de humo detectada',
    level: 'critical',
  },
]