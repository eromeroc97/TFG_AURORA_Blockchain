require('@testing-library/jest-dom')

const { TextDecoder, TextEncoder } = require('util')

if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder
}

if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = TextDecoder
}

globalThis.importMeta = {
  env: {
    VITE_API_URL: 'http://localhost:3000',
    VITE_BLOCKCHAIN_API_URL: 'http://localhost:3001',
    VITE_AUTH_API_URL: 'http://localhost:3002',
    VITE_TELEMETRY_API_URL: 'http://localhost:3003',
    VITE_IOT_MANAGER_API_URL: 'http://localhost:3004',
    VITE_AUDIT_API_URL: 'http://localhost:3005',
  },
}
