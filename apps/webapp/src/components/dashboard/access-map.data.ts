export type AccessMapEcosystem = {
  id: string
  name: string
  ownerId: string
  lat: number
  lng: number
  isShared: boolean
  devices: string[]
}

export const ACCESS_MAP_ECOSYSTEMS_MOCK: AccessMapEcosystem[] = [
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