# AgriPulse HMI - API Reference

Base URL (local): `http://localhost:4000`

All REST responses are JSON. Successful reads wrap the payload in `{ "data": ... }`.
Errors return `{ "error": "message", "details"?: ... }` with an appropriate HTTP
status (400 validation/bad request, 404 not found, 409 conflict/blocked, 422
schema validation, 500 server error).

---

## REST endpoints

### Diagnostics

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/health` | Backend + DB health, uptime, connected devices |
| `GET` | `/devices/:id/connection` | Live connection state of a device |

`GET /health` ->
```json
{ "status": "ok", "uptimeSeconds": 42, "database": "connected", "connectedDevices": ["demo-device-1"] }
```

### Devices

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/devices` | List devices (with settings) |
| `GET` | `/devices/:id` | Single device + settings |
| `PATCH` | `/devices/:id` | Update device profile (`name`, `fieldName`, `location`) |
| `GET` | `/devices/:id/latest` | Composite latest state for the dashboard |

`GET /devices/:id/latest` -> `data`:
```json
{
  "device": { "id": "...", "name": "...", "fieldName": "...", "location": "...", "status": "ONLINE" },
  "settings": { "moistureMinThreshold": 30, "rainProbabilityThreshold": 70, "tankMinThreshold": 20, "maxPumpRuntimeSeconds": 300, "mode": "MANUAL" },
  "mode": "MANUAL", "online": true, "emergencyStop": false,
  "pump": { "status": false, "valveStatus": false, "runtimeSeconds": 0, "source": null },
  "telemetry": { "soilMoisture": 37.8, "temperature": 26.4, "humidity": 55.8, "tankLevel": 85, "pumpStatus": false, "valveStatus": false, "emergencyStop": false },
  "weather": { "temperature": 24, "humidity": 60, "rainProbability": 10, "forecastSummary": "Clear & dry, 24°C" },
  "latestAlert": null,
  "latestDecision": null
}
```

### Telemetry

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/devices/:id/telemetry?range=24h&limit=500` | History (range: `1h,6h,12h,24h,7d,30d`) |
| `GET` | `/devices/:id/telemetry/latest` | Most recent persisted reading |

### Pump control

| Method | Path | Body | Description |
| ------ | ---- | ---- | ----------- |
| `POST` | `/devices/:id/pump/start` | `{ "runtimeSeconds"?: 60 }` | Start pump (safety-checked; 409 if blocked) |
| `POST` | `/devices/:id/pump/stop` | - | Stop pump |
| `POST` | `/devices/:id/pump/emergency-stop` | - | Activate emergency stop |
| `POST` | `/devices/:id/pump/emergency-reset` | - | Reset emergency stop |

A blocked start returns `409` with e.g. `{ "error": "Tank level 12.0% is below the minimum of 20%." }`.

### Mode

| Method | Path | Body | Description |
| ------ | ---- | ---- | ----------- |
| `POST` | `/devices/:id/mode` | `{ "mode": "AUTO" }` | Set `MANUAL` or `AUTO` |

### Alerts

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/devices/:id/alerts?acknowledged=false&limit=100` | List alerts |
| `PATCH` | `/alerts/:id/acknowledge` | Mark an alert acknowledged |

### Settings

| Method | Path | Body | Description |
| ------ | ---- | ---- | ----------- |
| `GET` | `/devices/:id/settings` | - | Current thresholds + mode |
| `PATCH` | `/devices/:id/settings` | partial | Update thresholds / mode |

`PATCH /devices/:id/settings` body (any subset):
```json
{ "moistureMinThreshold": 30, "rainProbabilityThreshold": 70, "tankMinThreshold": 20, "maxPumpRuntimeSeconds": 300, "mode": "AUTO" }
```

### Weather

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/weather/current?deviceId=...` | Latest current conditions |
| `GET` | `/weather/forecast?lat=&lon=` | 24h hourly forecast (Open-Meteo) |

---

## WebSocket events

Socket.IO. Two namespaces:

### Mobile namespace `/` (operator apps)

**Client -> Server**

| Event | Payload | Description |
| ----- | ------- | ----------- |
| `subscribe` | `{ deviceId }` | Join a device's room + receive a snapshot |
| `unsubscribe` | `{ deviceId }` | Leave the room |
| `pump:start` | `{ deviceId, runtimeSeconds? }` | Start the pump |
| `pump:stop` | `{ deviceId }` | Stop the pump |
| `mode:set` | `{ deviceId, mode }` | `MANUAL` / `AUTO` |
| `emergency:stop` | `{ deviceId }` | Activate emergency stop |
| `emergency:reset` | `{ deviceId }` | Reset emergency stop |
| `settings:update` | `{ deviceId, ...thresholds, mode? }` | Update settings |

**Server -> Client**

| Event | Payload |
| ----- | ------- |
| `telemetry:update` | `{ deviceId, soilMoisture, temperature, humidity, tankLevel, pumpStatus, valveStatus, emergencyStop, timestamp }` |
| `pump:status` | `{ deviceId, pumpStatus, valveStatus, source, runtimeSeconds, timestamp }` |
| `alert:new` | `{ id, deviceId, type, severity, message, acknowledged, createdAt }` |
| `device:connection` | `{ deviceId, status, timestamp }` |
| `automation:decision` | `{ id, deviceId, decision, reason, soilMoisture, tankLevel, rainProbability, pumpStarted, createdAt }` |
| `command:ack` | `{ event, ok, reason?, timestamp }` |

### Device namespace `/device` (simulator / IoT)

**Device -> Server**: `device:hello {deviceId, firmware}`, `device:telemetry {deviceId, ...reading}`

**Server -> Device**: `config {mode, emergencyStop, maxPumpRuntimeSeconds}`,
`command:pump {action, runtimeSeconds, source}`, `command:emergency {action}`

---

## Quick cURL examples

```bash
curl http://localhost:4000/health
curl http://localhost:4000/devices/demo-device-1/latest
curl -X POST http://localhost:4000/devices/demo-device-1/pump/start -H 'Content-Type: application/json' -d '{"runtimeSeconds":60}'
curl -X POST http://localhost:4000/devices/demo-device-1/mode -H 'Content-Type: application/json' -d '{"mode":"AUTO"}'
curl -X PATCH http://localhost:4000/devices/demo-device-1/settings -H 'Content-Type: application/json' -d '{"moistureMinThreshold":35}'
```

A ready-to-import Postman collection is provided at
[`AgriPulse.postman_collection.json`](AgriPulse.postman_collection.json).
