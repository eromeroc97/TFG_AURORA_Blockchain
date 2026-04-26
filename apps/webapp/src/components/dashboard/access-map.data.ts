export type AccessMapDevice = {
  id: string
  name: string
  macAddress: string | null
  vendor: string | null
  ecosystemId: string
  createdAt: string
  updatedAt: string
}

export type AccessMapEcosystem = {
  id: string
  name: string
  ownerId: string
  lat: number | null
  lng: number | null
  isShared: boolean
  devices: AccessMapDevice[]
}

export const ACCESS_MAP_ECOSYSTEMS_MOCK: AccessMapEcosystem[] = [
  {
    id: 'eco-001',
    name: 'Hogar Inteligente - Toledo Norte',
    ownerId: '123e4567-e89b-12d3-a456-426614174000',
    lat: 39.876,
    lng: -4.025,
    isShared: false,
    devices: [
      {
        id: 'device-001',
        name: 'Sensores de movimiento',
        macAddress: null,
        vendor: null,
        ecosystemId: 'eco-001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'device-002',
        name: 'Cámara interior',
        macAddress: null,
        vendor: null,
        ecosystemId: 'eco-001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'device-003',
        name: 'Medidor energético',
        macAddress: null,
        vendor: null,
        ecosystemId: 'eco-001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'eco-002',
    name: 'Laboratorio Domótico - Campus UCLM',
    ownerId: '71ac8f45-8d9f-4e03-bfdf-3f0c81a4e7f4',
    lat: 39.862,
    lng: -4.025,
    isShared: true,
    devices: [
      {
        id: 'device-004',
        name: 'Gateway IoT',
        macAddress: null,
        vendor: null,
        ecosystemId: 'eco-002',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'device-005',
        name: 'Sensor de apertura',
        macAddress: null,
        vendor: null,
        ecosystemId: 'eco-002',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'device-006',
        name: 'Control de acceso',
        macAddress: null,
        vendor: null,
        ecosystemId: 'eco-002',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'eco-003',
    name: 'Piloto Energético - Albacete',
    ownerId: 'f46f4f2f-cf3d-4170-a957-6b3f257cf8a5',
    lat: 38.994,
    lng: -1.856,
    isShared: false,
    devices: [
      {
        id: 'device-007',
        name: 'Inversor solar',
        macAddress: null,
        vendor: null,
        ecosystemId: 'eco-003',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'device-008',
        name: 'Medidor de consumo',
        macAddress: null,
        vendor: null,
        ecosystemId: 'eco-003',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'device-009',
        name: 'Sensor térmico',
        macAddress: null,
        vendor: null,
        ecosystemId: 'eco-003',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'eco-004',
    name: 'Vivienda Segura - Ciudad Real',
    ownerId: '123e4567-e89b-12d3-a456-426614174000',
    lat: 38.986,
    lng: -3.932,
    isShared: true,
    devices: [
      {
        id: 'device-010',
        name: 'Sirena perimetral',
        macAddress: null,
        vendor: null,
        ecosystemId: 'eco-004',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'device-011',
        name: 'Detector de humo',
        macAddress: null,
        vendor: null,
        ecosystemId: 'eco-004',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'device-012',
        name: 'Control de persianas',
        macAddress: null,
        vendor: null,
        ecosystemId: 'eco-004',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },
]