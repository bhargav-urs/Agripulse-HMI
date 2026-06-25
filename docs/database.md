# AgriPulse HMI - Database

PostgreSQL 16, managed with **Prisma ORM**. The schema lives in
[`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma); the generated
SQL migration is under `backend/prisma/migrations/`.

## Entity-relationship overview

```
                    ┌──────────────┐
                    │   devices    │
                    │  (1 demo)    │
                    └──────┬───────┘
        1:1 ┌──────────────┼───────────────┬───────────────┬───────────────┐
            ▼              ▼ 1:N            ▼ 1:N           ▼ 1:N           ▼ 1:N
   ┌────────────────┐ ┌───────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐
   │ device_settings│ │ telemetry │ │ pump_events │ │    alerts    │ │ weather_snapshots /  │
   │                │ │           │ │             │ │              │ │ automation_decisions │
   └────────────────┘ └───────────┘ └─────────────┘ └──────────────┘ └──────────────────────┘
```

All child tables reference `devices.id` with `ON DELETE CASCADE`.

## Tables

### `devices`
| Column | Type | Notes |
| ------ | ---- | ----- |
| id | text (cuid) | PK |
| name | text | e.g. "Greenhouse Pump A" |
| field_name | text | e.g. "North Field" |
| location | text | e.g. "Bengaluru, IN" |
| status | enum `DeviceStatus` | `ONLINE` / `OFFLINE` |
| created_at / updated_at | timestamptz | |

### `device_settings` (1:1 with device)
| Column | Type | Default |
| ------ | ---- | ------- |
| device_id | text (unique FK) | |
| moisture_min_threshold | float | 30 |
| moisture_target_threshold | float | 55 |
| rain_probability_threshold | float | 70 |
| tank_min_threshold | float | 20 |
| max_pump_runtime_seconds | int | 300 |
| mode | enum `IrrigationMode` | `MANUAL` |

### `telemetry` (time-series)
| Column | Type |
| ------ | ---- |
| device_id | FK |
| soil_moisture, temperature, humidity, tank_level | float |
| pump_status, valve_status, emergency_stop | boolean |
| created_at | timestamptz |

Indexed on `(device_id, created_at)` for fast range queries. Written at most once
per ~10s per device (and always on pump-state change) to bound growth.

### `pump_events`
| Column | Type | Notes |
| ------ | ---- | ----- |
| action | enum `PumpAction` | `START` / `STOP` / `EMERGENCY_STOP` / `EMERGENCY_RESET` |
| source | enum `CommandSource` | `MANUAL` / `AUTO` / `SAFETY` / `SYSTEM` |
| duration_seconds | int? | runtime at stop / requested runtime at start |
| reason | text? | human-readable context |

### `alerts`
| Column | Type | Notes |
| ------ | ---- | ----- |
| type | enum `AlertType` | LOW_SOIL_MOISTURE, LOW_TANK_LEVEL, PUMP_OVERRUN, DEVICE_DISCONNECTED, EMERGENCY_STOP, WEATHER_UNAVAILABLE |
| severity | enum `AlertSeverity` | INFO / WARNING / CRITICAL |
| message | text | |
| acknowledged | boolean | default false |

Indexed on `(device_id, created_at)` and `(device_id, acknowledged)`.

### `weather_snapshots`
| Column | Type |
| ------ | ---- |
| temperature, humidity, rain_probability | float |
| forecast_summary | text |

### `automation_decisions`
| Column | Type | Notes |
| ------ | ---- | ----- |
| decision | enum `AutomationDecisionType` | `IRRIGATE` / `SKIP` |
| reason | text | why |
| soil_moisture, tank_level | float | inputs at decision time |
| rain_probability | float? | null when weather unavailable |
| pump_started | boolean | whether the pump actually started |

## Enums

`IrrigationMode`, `DeviceStatus`, `PumpAction`, `CommandSource`, `AlertType`,
`AlertSeverity`, `AutomationDecisionType` - defined in the Prisma schema and
materialised as native PostgreSQL enum types.

## Seed data

`backend/prisma/seed.ts` (and the idempotent `ensureSeedData()` run on boot)
create one demo device (`demo-device-1`) with default settings, plus ~48
historical telemetry rows so the History screen has data on a fresh database.

## Common queries

```sql
-- latest reading
SELECT * FROM telemetry WHERE device_id = 'demo-device-1' ORDER BY created_at DESC LIMIT 1;

-- unacknowledged critical alerts
SELECT * FROM alerts WHERE device_id = 'demo-device-1' AND acknowledged = false AND severity = 'CRITICAL';

-- automation decisions today
SELECT decision, reason, created_at FROM automation_decisions
WHERE device_id = 'demo-device-1' AND created_at::date = now()::date
ORDER BY created_at DESC;
```
