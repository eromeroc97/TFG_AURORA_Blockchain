db = db.getSiblingDB('iot_data');
db.createCollection('telemetry', {
  timeseries: {
    timeField: 'timestamp',
    metaField: 'device_did',
    granularity: 'seconds'
  }
});
