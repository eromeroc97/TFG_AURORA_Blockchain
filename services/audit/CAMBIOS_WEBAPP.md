# CAMBIOS_NECESARIOS_WEBAPP.md - AuditDashboard

## Descripción
Este documento detalla **todos** los cambios necesarios en la webapp (`apps/webapp`) para integrar el **AuditDashboard** que se nutrirá del servicio `services/audit`.

---

## 1. Nuevos Modelos de Datos

### Crear: `apps/webapp/src/models/audit.model.ts`

```typescript
// Timeline de anclajes
export type AuditTimelineItem = {
  timestamp: string;      // ISO-8601
  ingestId: string;
  ecosystemId: string;
  telemetryHash: string;
  txId: string;           // FireFly transaction ID
  blockNumber?: number;    // Block number (si está disponible vía FireFly)
};

export type AuditTimelineResponse = {
  timeline: AuditTimelineItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
};

// Estadísticas de Blockchain
export type BlockchainStats = {
  totalAnchors: number;
  successRate: number;        // Porcentaje (0-100)
  totalBlocks: number;         // Total de bloques en la cadena
  totalTransactions: number;   // Total de transacciones de anclaje
  avgAnchorsPerBlock: number;
  activeEcosystems: number;
  recentActivity: {            // Para gráfico de barras
    hour: string;
    count: number;
  }[];
  statusDistribution: {        // Para gráfico circular
    name: string;
    value: number;
  }[];
  lastBlockNumber: number;
  lastBlockTime: string;
};

// Visualización de la Cadena
export type ChainBlock = {
  blockNumber: number;
  blockHash: string;
  parentHash: string;
  timestamp: string;
  transactionCount: number;
  transactions: {
    txId: string;
    type: 'anchor';
    ingestId: string;
    ecosystemId: string;
  }[];
};

export type ChainVisualization = {
  chain: ChainBlock[];
  summary: {
    totalBlocks: number;
    totalTransactions: number;
    chainHealth: 'healthy' | 'degraded' | 'error';
    latestBlockNumber: number;
    latestBlockTime: string;
  };
};

// Filtros para timeline
export type TimelineFilters = {
  ecosystemId?: string;
  start?: string;
  end?: string;
  limit: number;
  offset: number;
};
```

---

## 2. Nuevo Servicio: `apps/webapp/src/services/audit.service.ts`

Sigue el patrón de `telemetry.service.ts` y `dashboard.service.ts`:

```typescript
import { apiClient } from '../api/axios';
import type { 
  AuditTimelineResponse, 
  BlockchainStats, 
  ChainVisualization, 
  TimelineFilters 
} from '../models/audit.model';

// Obtener timeline de anclajes
export async function getAuditTimeline(
  filters: TimelineFilters = { limit: 50, offset: 0 }
): Promise<AuditTimelineResponse> {
  const response = await apiClient.get<AuditTimelineResponse>('/audit/timeline', {
    params: {
      ecosystemId: filters.ecosystemId,
      start: filters.start,
      end: filters.end,
      limit: filters.limit,
      offset: filters.offset,
    },
  });
  return response.data;
}

// Obtener estadísticas de blockchain
export async function getBlockchainStats(): Promise<BlockchainStats> {
  const response = await apiClient.get<BlockchainStats>('/audit/stats');
  return response.data;
}

// Obtener visualización de la cadena
export async function getChainVisualization(
  startBlock?: number,
  endBlock?: number,
  limit: number = 50
): Promise<ChainVisualization> {
  const response = await apiClient.get<ChainVisualization>('/audit/chain/visual', {
    params: {
      startBlock,
      endBlock,
      limit,
    },
  });
  return response.data;
}

// Obtener anclaje por ID
export async function getAnchorByIngestId(ingestId: string): Promise<AuditTimelineItem> {
  const response = await apiClient.get<AuditTimelineItem>(`/audit/ingest/${ingestId}`);
  return response.data;
}

// Obtener anclajes por hash
export async function getAnchorsByHash(hash: string): Promise<AuditTimelineItem[]> {
  const response = await apiClient.get<AuditTimelineItem[]>(`/audit/hash/${hash}`);
  return response.data;
}

// Obtener anclajes por ecosistema
export async function getAnchorsByEcosystem(
  ecosystemId: string,
  startTime?: string,
  endTime?: string
): Promise<AuditTimelineItem[]> {
  const response = await apiClient.get<AuditTimelineItem[]>('/audit/ecosystem/' + ecosystemId, {
    params: { startTime, endTime },
  });
  return response.data;
}
```

---

## 3. Nuevo Controlador: `apps/webapp/src/controllers/useAuditController.ts`

```typescript
import { useEffect, useState, useCallback } from 'react';
import { 
  getAuditTimeline, 
  getBlockchainStats, 
  getChainVisualization 
} from '../services/audit.service';
import type { 
  AuditTimelineItem, 
  BlockchainStats, 
  ChainBlock,
  AuditTimelineResponse 
} from '../models/audit.model';

export function useAuditController() {
  // Timeline state
  const [timeline, setTimeline] = useState<AuditTimelineItem[]>([]);
  const [timelineTotal, setTimelineTotal] = useState(0);
  const [timelineFilters, setTimelineFilters] = useState({
    limit: 50,
    offset: 0,
    ecosystemId: undefined as string | undefined,
    start: undefined as string | undefined,
    end: undefined as string | undefined,
  });

  // Stats state
  const [stats, setStats] = useState<BlockchainStats | null>(null);

  // Chain visualization state
  const [chainBlocks, setChainBlocks] = useState<ChainBlock[]>([]);
  const [chainSummary, setChainSummary] = useState<ChainVisualization['summary'] | null>(null);

  // Loading/error states
  const [isLoading, setIsLoading] = useState(true);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [isChainLoading, setIsChainLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load timeline
  const loadTimeline = useCallback(async () => {
    setIsTimelineLoading(true);
    setError(null);
    try {
      const response = await getAuditTimeline(timelineFilters);
      setTimeline(response.timeline);
      setTimelineTotal(response.pagination.total);
    } catch (err) {
      setError('No se ha podido cargar la línea de tiempo de auditoría.');
      setTimeline([]);
    } finally {
      setIsTimelineLoading(false);
    }
  }, [timelineFilters]);

  // Load blockchain stats
  const loadStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const data = await getBlockchainStats();
      setStats(data);
    } catch (err) {
      setStats(null);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Load chain visualization
  const loadChainVisualization = useCallback(async (startBlock?: number, endBlock?: number) => {
    setIsChainLoading(true);
    try {
      const data = await getChainVisualization(startBlock, endBlock);
      setChainBlocks(data.chain);
      setChainSummary(data.summary);
    } catch (err) {
      setChainBlocks([]);
    } finally {
      setIsChainLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      loadTimeline(),
      loadStats(),
      loadChainVisualization(),
    ]).finally(() => setIsLoading(false));
  }, [loadTimeline, loadStats, loadChainVisualization]);

  // Pagination handlers
  const nextPage = () => {
    if (timelineFilters.offset + timelineFilters.limit < timelineTotal) {
      setTimelineFilters(prev => ({
        ...prev,
        offset: prev.offset + prev.limit,
      }));
    }
  };

  const prevPage = () => {
    setTimelineFilters(prev => ({
      ...prev,
      offset: Math.max(0, prev.offset - prev.limit),
    }));
  };

  const goToPage = (page: number) => {
    setTimelineFilters(prev => ({
      ...prev,
      offset: page * prev.limit,
    }));
  };

  return {
    // Timeline
    timeline,
    timelineTotal,
    timelineFilters,
    setTimelineFilters,
    isTimelineLoading,
    nextPage,
    prevPage,
    goToPage,
    
    // Stats
    stats,
    isStatsLoading,
    
    // Chain
    chainBlocks,
    chainSummary,
    isChainLoading,
    loadChainVisualization,
    
    // General
    isLoading,
    error,
    refresh: () => {
      void loadTimeline();
      void loadStats();
      void loadChainVisualization();
    },
  };
}
```

---

## 4. Nueva Página: `apps/webapp/src/pages/AuditDashboard.tsx`

Esta página seguirá el estilo de `MainDashboard.tsx` usando Tailwind CSS y Recharts.

### Estructura de la página:
1. **Header**: Título "Auditoría Blockchain" con icono Activity
2. **Stats Cards**: 4 tarjetas con estadísticas principales
3. **Timeline Chart**: Gráfico de línea/área con timeline de anclajes
4. **Status Distribution**: Gráfico circular con distribución de estados
5. **Chain Visualization**: Representación visual de bloques (lista estilizada)
6. **Timeline Table**: Tabla paginada con anclajes recientes

### Dependencias necesarias (ya instaladas):
- `recharts` - Para gráficos
- `lucide-react` - Para iconos
- `react` - Para hooks

### Código base (simplificado):
```tsx
import { useMemo } from 'react';
import {
  Line, LineChart, Bar, BarChart, Pie, PieChart,
  CartesianGrid, Cell, Legend, Tooltip, XAxis, YAxis, ResponsiveContainer
} from 'recharts';
import { Activity, Database, Link, TrendingUp, Blocks } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { useAuditController } from '../controllers/useAuditController';

export default function AuditDashboard() {
  const { authClaims } = useAuth();
  const {
    timeline, timelineTotal, timelineFilters, isTimelineLoading,
    stats, isStatsLoading,
    chainBlocks, chainSummary, isChainLoading,
    isLoading, error, refresh
  } = useAuditController();

  // Calcular páginas totales
  const totalPages = useMemo(() => 
    Math.ceil(timelineTotal / timelineFilters.limit), [timelineTotal, timelineFilters.limit]
  );
  const currentPage = useMemo(() => 
    Math.floor(timelineFilters.offset / timelineFilters.limit), [timelineFilters.offset, timelineFilters.limit]
  );

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Auditoría Blockchain</h1>
            <p className="text-slate-600 mt-2">
              Monitorización y auditoría de anclajes en Hyperledger Fabric
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 text-slate-900">
              <Database className="h-6 w-6 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-slate-500">Total Anclajes</p>
                <h2 className="text-xl font-semibold">{stats?.totalAnchors || 0}</h2>
              </div>
            </div>
          </div>
          
          {/* Más tarjetas: Tasa Éxito, Total Bloques, Transacciones */}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 xl:grid-cols-2 mb-6">
          {/* Timeline Chart */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Timeline de Anclajes</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.recentActivity || []}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Distribución de Estados</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={stats?.statusDistribution || []} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={90} 
                    innerRadius={48}
                  >
                    {(stats?.statusDistribution || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#14b8a6' : '#f97316'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chain Visualization */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-4 text-slate-900">
            <Blocks className="h-6 w-6 text-violet-600" />
            <div>
              <h3 className="text-lg font-semibold">Visualización de la Cadena</h3>
              <p className="text-sm text-slate-500">
                Bloque actual: #{chainSummary?.latestBlockNumber} - 
                Salud: <span className="font-medium">{chainSummary?.chainHealth}</span>
              </p>
            </div>
          </div>
          
          {/* Lista de bloques */}
          <div className="space-y-3">
            {chainBlocks.map((block) => (
              <div key={block.blockNumber} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-slate-900">Bloque #{block.blockNumber}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(block.timestamp).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">
                      {block.transactionCount} transacciones
                    </p>
                    <p className="text-xs text-slate-500">
                      Hash: {block.blockHash.slice(0, 16)}...
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Table */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Timeline de Anclajes</h3>
          
          {/* Tabla paginada */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-3">Timestamp</th>
                <th className="text-left p-3">Ingest ID</th>
                <th className="text-left p-3">Ecosistema</th>
                <th className="text-left p-3">Hash</th>
                <th className="text-left p-3">Tx ID</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((item) => (
                <tr key={item.ingestId} className="border-b border-slate-100">
                  <td className="p-3 text-sm">{new Date(item.timestamp).toLocaleString('es-ES')}</td>
                  <td className="p-3 text-sm font-mono">{item.ingestId.slice(0, 16)}...</td>
                  <td className="p-3 text-sm">{item.ecosystemId}</td>
                  <td className="p-3 text-sm font-mono">{item.telemetryHash.slice(0, 16)}...</td>
                  <td className="p-3 text-sm font-mono">{item.txId.slice(0, 16)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Paginación */}
          <div className="flex justify-between items-center mt-4">
            <button 
              onClick={() => prevPage()}
              disabled={currentPage === 0}
              className="px-4 py-2 rounded-lg bg-slate-100 disabled:opacity-50"
            >
              Anterior
            </button>
            <span>Página {currentPage + 1} de {totalPages}</span>
            <button 
              onClick={() => nextPage()}
              disabled={currentPage >= totalPages - 1}
              className="px-4 py-2 rounded-lg bg-slate-100 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Navegación: Actualizar `apps/webapp/src/App.tsx`

Añadir la nueva ruta para el AuditDashboard:

```tsx
import AuditDashboard from './pages/AuditDashboard';

// Dentro del componente App, añadir la ruta:
<Route path="/audit" element={
  <RequireAuth>
    <AuditDashboard />
  </RequireAuth>
} />
```

---

## 6. Header: Actualizar `apps/webapp/src/components/layout/Header.tsx`

Añadir enlace al dashboard de auditoría en el menú de navegación:

```tsx
// Importar icono
import { Activity } from 'lucide-react';

// En el menú de navegación, añadir:
<NavLink 
  to="/audit" 
  className={({ isActive }) => 
    `flex items-center gap-2 px-4 py-2 rounded-lg transition ${
      isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
    }`
  }
>
  <Activity className="h-5 w-5" />
  <span>Auditoría</span>
</NavLink>
```

---

## 7. Componentes Reutilizables (Opcional)

### Crear: `apps/webapp/src/components/audit/ChainBlockCard.tsx`
Componente para renderizar un bloque de la cadena.

### Crear: `apps/webapp/src/components/audit/TimelineChart.tsx`
Gráfico de timeline reutilizable.

### Crear: `apps/webapp/src/components/audit/StatsCard.tsx`
Tarjeta de estadísticas reutilizable.

---

## 8. Variables de Entorno Webapp

Asegurarse de que el `apiClient` en `apps/webapp/src/api/axios.ts` apunte al servicio de auditoría.

Si el servicio audit corre en puerto 3003, asegurar que el proxy de desarrollo en `vite.config.ts` tenga:

```typescript
export default defineConfig({
  // ... otras configuraciones
  server: {
    proxy: {
      '/audit': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
      // ... otros proxies
    }
  }
});
```

---

## 9. Resumen de Cambios

| Archivo | Acción | Descripción |
|--------|---------|-------------|
| `models/audit.model.ts` | **Crear** | Modelos TypeScript para timeline, stats, chain |
| `services/audit.service.ts` | **Crear** | Servicio para consumir API de audit |
| `controllers/useAuditController.ts` | **Crear** | Controlador con estado y paginación |
| `pages/AuditDashboard.tsx` | **Crear** | Página principal del dashboard |
| `App.tsx` | **Modificar** | Añadir ruta `/audit` |
| `components/layout/Header.tsx` | **Modificar** | Añadir enlace a auditoría |
| `api/axios.ts` | **Verificar** | Asegurar configuración baseURL |
| `vite.config.ts` | **Modificar** | Añadir proxy para `/audit` |

---

## 10. Orden de Implementación Recomendado

1. Crear modelos (`audit.model.ts`)
2. Crear servicio (`audit.service.ts`)
3. Crear controlador (`useAuditController.ts`)
4. Actualizar `App.tsx` con la ruta
5. Actualizar `Header.tsx` con navegación
6. Crear página `AuditDashboard.tsx`
7. Probar y ajustar estilos

---

**Nota**: El servicio de auditoría (`services/audit`) debe estar desplegado y funcionando antes de probar la webapp.
