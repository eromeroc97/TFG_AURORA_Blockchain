const { createHash } = require('crypto');
const stableSortObject = (value) => {
  if (Array.isArray(value)) return value.map(stableSortObject);
  if (value && typeof value === 'object') return Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).reduce((acc,[key,val]) => { acc[key] = stableSortObject(val); return acc; }, {});
  return value;
};
const payload = { devices: [{ mac_addr: 'AA:BB:CC:DD:EE:FF', model: 'ESP32-WROOM-32', vendor: 'Espressif' }] };
const latitude = 39.8568;
const longitude = -4.0245;
const hash = createHash('sha256').update(JSON.stringify({ payload: stableSortObject(payload), gps: { latitude, longitude } })).digest('hex');
console.log(hash);
