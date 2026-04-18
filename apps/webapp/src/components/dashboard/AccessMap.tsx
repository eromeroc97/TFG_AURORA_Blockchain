import L from 'leaflet'
import { useMemo } from 'react'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../../context/auth-context'

type EcosystemNode = {
  id: string
  name: string
  ownerId: string
  lat: number
  lng: number
  isShared: boolean
  devices: string[]
}

type AccessRole = 'USER' | 'AUDITOR' | 'ADMIN' | 'GLOBAL_ADMIN'

const CENTRAL_BRAIN_COORDS: [number, number] = [38.991, -3.921]

const ecosystemNodesMock: EcosystemNode[] = [
  {
    id: 'eco-001',
    name: 'Hogar Inteligente - Toledo Norte',
    ownerId: '123e4567-e89b-12d3-a456-426614174000',
    lat: 39.876,
    lng: -4.025,
    isShared: false,
    devices: ['Sensores de movimiento', 'Cámara interior', 'Medidor energético'],
  },
  {
    id: 'eco-002',
    name: 'Laboratorio Domótico - Campus UCLM',
    ownerId: '71ac8f45-8d9f-4e03-bfdf-3f0c81a4e7f4',
    lat: 39.862,
    lng: -4.025,
    isShared: true,
    devices: ['Gateway IoT', 'Sensor de apertura', 'Control de acceso'],
  },
  {
    id: 'eco-003',
    name: 'Piloto Energético - Albacete',
    ownerId: 'f46f4f2f-cf3d-4170-a957-6b3f257cf8a5',
    lat: 38.994,
    lng: -1.856,
    isShared: false,
    devices: ['Inversor solar', 'Medidor de consumo', 'Sensor térmico'],
  },
  {
    id: 'eco-004',
    name: 'Vivienda Segura - Ciudad Real',
    ownerId: '123e4567-e89b-12d3-a456-426614174000',
    lat: 38.986,
    lng: -3.932,
    isShared: true,
    devices: ['Sirena perimetral', 'Detector de humo', 'Control de persianas'],
  },
]

const centralShieldIcon = L.divIcon({
  className: 'central-brain-shield-icon',
  html: '<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:999px;background:#0a2540;color:#f9fafb;font-size:18px;box-shadow:0 8px 20px rgba(10,37,64,0.35);">🛡</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
})

export default function AccessMap() {
  const { authClaims } = useAuth()
  const role = (authClaims?.role?.toUpperCase() ?? 'USER') as AccessRole
  const currentUserId = authClaims?.sub ?? 'anonymous-user'

  const visibleNodes = useMemo(() => {
    if (role === 'USER') {
      return ecosystemNodesMock.filter((node) => node.ownerId === currentUserId || node.isShared)
    }

    return ecosystemNodesMock
  }, [currentUserId, role])

  const canViewDevices = (node: EcosystemNode) => {
    if (role === 'AUDITOR') {
      return true
    }

    if (role === 'USER') {
      return node.ownerId === currentUserId
    }

    return false
  }

  return (
    <div className="mt-5 h-[520px] w-full overflow-hidden rounded-[1.25rem] border border-primary/15 bg-white/70 shadow-aurora">
      <MapContainer
        center={CENTRAL_BRAIN_COORDS}
        zoom={6}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {visibleNodes.map((node) => (
          <CircleMarker
            key={node.id}
            center={[node.lat, node.lng]}
            radius={10}
            pathOptions={{
              color: node.ownerId === currentUserId ? '#0A2540' : '#14B8A6',
              fillColor: node.ownerId === currentUserId ? '#0A2540' : '#14B8A6',
              fillOpacity: 0.75,
              weight: 2,
            }}
          >
            <Popup>
              <div className="space-y-2 text-primary">
                <p className="text-sm font-semibold">{node.name}</p>
                <p className="text-xs text-muted">
                  Ubicación: {node.lat.toFixed(3)}, {node.lng.toFixed(3)}
                </p>

                {canViewDevices(node) ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                      Dispositivos
                    </p>
                    <ul className="mt-1 list-disc pl-4 text-xs text-muted">
                      {node.devices.map((device) => (
                        <li key={device}>{device}</li>
                      ))}
                    </ul>
                  </div>
                ) : role === 'ADMIN' || role === 'GLOBAL_ADMIN' ? (
                  <p className="text-xs font-semibold text-rose-700">Acceso a dispositivos restringido</p>
                ) : (
                  <p className="text-xs text-muted">No tienes permisos para ver los dispositivos.</p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {role === 'GLOBAL_ADMIN' ? (
          <Marker position={CENTRAL_BRAIN_COORDS} icon={centralShieldIcon}>
            <Popup>
              <div className="space-y-2 text-primary">
                <p className="text-sm font-semibold">Cerebro Central</p>
                <p className="text-xs text-muted">Nodo de coordinación global para administración avanzada.</p>
              </div>
            </Popup>
          </Marker>
        ) : null}
      </MapContainer>
    </div>
  )
}