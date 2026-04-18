import L from 'leaflet'
import { useEffect, useMemo } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Brain, House } from 'lucide-react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
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

export type AccessMapEcosystem = EcosystemNode

type AccessMapProps = {
  ecosystems?: AccessMapEcosystem[]
}

const CENTRAL_BRAIN_COORDS: [number, number] = [38.991, -3.921]

const createHouseIcon = (isOwned: boolean) =>
  L.divIcon({
    className: 'ecosystem-house-marker',
    html: renderToStaticMarkup(
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '38px',
          height: '38px',
          borderRadius: '999px',
          background: isOwned ? '#0A2540' : '#14B8A6',
          color: '#F9FAFB',
          boxShadow: '0 10px 22px rgba(10,37,64,0.22)',
          border: '2px solid rgba(255,255,255,0.92)',
        }}
      >
        <House size={18} strokeWidth={2.4} />
      </div>,
    ),
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -16],
  })

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
  className: 'central-brain-marker',
  html: renderToStaticMarkup(
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '46px',
        height: '46px',
        borderRadius: '999px',
        background: '#0A2540',
        color: '#F9FAFB',
        boxShadow: '0 12px 26px rgba(10,37,64,0.26)',
        border: '2px solid rgba(20,184,166,0.9)',
      }}
    >
      <Brain size={21} strokeWidth={2.2} />
    </div>,
  ),
  iconSize: [46, 46],
  iconAnchor: [23, 23],
  popupAnchor: [0, -20],
})

function MapViewportUpdater({ points }: { points: Array<[number, number]> }) {
  const map = useMap()

  useEffect(() => {
    if (points.length === 0) {
      map.setView(CENTRAL_BRAIN_COORDS, 6, { animate: true })
      return
    }

    const bounds = L.latLngBounds(points)

    if (points.length === 1) {
      map.setView(points[0], 8, { animate: true })
      return
    }

    map.fitBounds(bounds, {
      padding: [32, 32],
      maxZoom: 9,
      animate: true,
    })
  }, [map, points])

  return null
}

export default function AccessMap({ ecosystems }: AccessMapProps) {
  const { authClaims } = useAuth()
  const role = (authClaims?.role?.toUpperCase() ?? 'USER') as AccessRole
  const currentUserId = authClaims?.sub ?? 'anonymous-user'
  const sourceNodes = ecosystems ?? ecosystemNodesMock

  const visibleNodes = useMemo(() => {
    if (role === 'USER') {
      return sourceNodes.filter((node) => node.ownerId === currentUserId || node.isShared)
    }

    return sourceNodes
  }, [currentUserId, role, sourceNodes])

  const mapPoints = useMemo(() => {
    const ecosystemPoints = visibleNodes.map((node) => [node.lat, node.lng] as [number, number])

    return role === 'GLOBAL_ADMIN'
      ? [...ecosystemPoints, CENTRAL_BRAIN_COORDS]
      : ecosystemPoints
  }, [role, visibleNodes])

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
    <div className="mt-5 h-[520px] w-full overflow-hidden rounded-[1.25rem] border border-primary/10 bg-white shadow-aurora">
      <MapContainer
        center={CENTRAL_BRAIN_COORDS}
        zoom={6}
        maxZoom={10}
        scrollWheelZoom
        className="h-full w-full"
      >
        <MapViewportUpdater points={mapPoints} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        />

        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          opacity={0.95}
        />

        {visibleNodes.map((node) => (
          <Marker
            key={node.id}
            position={[node.lat, node.lng]}
            icon={createHouseIcon(node.ownerId === currentUserId)}
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
          </Marker>
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