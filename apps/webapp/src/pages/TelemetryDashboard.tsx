import { BarChart3, TrendingUp, Zap } from 'lucide-react'

/**
 * Página de Telemetría - Dashboard de métricas de telemetría.
 * Muestra métricas clave relacionadas con el volumen transaccional,
 * tasa de éxito de anclaje y top ecosistemas.
 */
export default function TelemetryDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Título principal */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Métricas de Telemetría</h1>
          <p className="text-gray-600 mt-2">
            Monitorea el rendimiento y las métricas clave de tu ecosistema blockchain.
          </p>
        </div>

        {/* Cuadrícula de tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Tarjeta: Volumen Transaccional */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Volumen Transaccional</h2>
            </div>
            <p className="text-gray-600">Gráfico en construcción...</p>
          </div>

          {/* Tarjeta: Tasa de Éxito de Anclaje */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <TrendingUp className="h-8 w-8 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Tasa de Éxito de Anclaje</h2>
            </div>
            <p className="text-gray-600">Gráfico en construcción...</p>
          </div>

          {/* Tarjeta: Top Ecosistemas */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Zap className="h-8 w-8 text-purple-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Top Ecosistemas</h2>
            </div>
            <p className="text-gray-600">Gráfico en construcción...</p>
          </div>
        </div>
      </div>
    </div>
  )
}