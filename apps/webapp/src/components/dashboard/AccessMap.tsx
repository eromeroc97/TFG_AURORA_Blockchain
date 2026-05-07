import L from 'leaflet'
import { useMemo } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Brain, House } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../../context/auth-context'
import type { AccessMapEcosystem } from '../../services/ecosystems.service'

/**
 * Rol de acceso a ecosistema.
 */
type AccessRole = 'USER' | 'AUDITOR' | 'ADMIN' | 'GLOBAL_ADMIN'

/**
 * Props del componente AccessMap.
 */
type AccessMapProps = {
  /** Lista de ecosistemas a mostrar en el mapa */
  ecosystems?: AccessMapEcosystem[]
}

const CENTRAL_BRAIN_COORDS: [number, number] = [38.99009855762482, -3.920457433978659]

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

export default function AccessMap({ ecosystems }: AccessMapProps) {
  const { authClaims } = useAuth()
  const navigate = useNavigate()
  const role = (authClaims?.role?.toUpperCase() ?? 'USER') as AccessRole
  const currentUserId = authClaims?.sub ?? 'anonymous-user'
  const sourceNodes = ecosystems ?? []
  const mapNodes = sourceNodes.filter(
    (node): node is AccessMapEcosystem & { lat: number; lng: number } =>
      node.lat != null && node.lng != null,
  )

  const visibleNodes = useMemo(() => {
    if (role === 'USER') {
      return mapNodes.filter((node) => 
        node.ownerId === currentUserId || 
        node.isShared ||
        node.accessType === 'DELEGATED'
      )
    }

    return mapNodes
  }, [currentUserId, mapNodes, role])

  return (
    <div className="relative z-0 mt-5 h-[520px] w-full overflow-hidden rounded-[1.25rem] border border-primary/10 bg-white shadow-aurora">
      <MapContainer
        center={CENTRAL_BRAIN_COORDS}
        zoom={6}
        scrollWheelZoom
        className="aurora-leaflet-map h-full w-full"
      >
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
            icon={createHouseIcon(node.ownerId === currentUserId || node.accessType === 'OWNER')}
          >
            <Popup>
              <div className="space-y-2 text-primary" style={{ textAlign: 'center' }}>
                <p className="text-sm font-semibold">{node.name}</p>
                <p className="text-xs text-muted">
                  Ubicación: {typeof node.lat === 'number' && typeof node.lng === 'number'
                    ? `${node.lat.toFixed(3)}, ${node.lng.toFixed(3)}`
                    : 'No disponible'}
                </p>

                <button
                  type="button"
                  style={{
                    marginTop: '8px',
                    borderRadius: '6px',
                    backgroundColor: '#14B8A6',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/ecosystems', { state: { selectedId: node.id }, replace: true })}
                >
                  Más información
                </button>
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