# AgriPulse HMI - Product Brief & User Stories

## Product

**AgriPulse HMI** is a React Native mobile HMI for monitoring and controlling a
simulated smart-irrigation pump system using real-time telemetry, weather-aware
automation, PostgreSQL persistence, and WebSocket device communication.

## Target users

- Farmers
- Greenhouse operators
- Field technicians
- Irrigation system operators
- Maintenance engineers

The operator should be able to quickly understand whether the field needs water,
whether the pump is running, and whether the system is safe.

## Personas

| Persona | Goal | Primary screens |
| ------- | ---- | --------------- |
| **Greenhouse operator** | Keep soil moisture in range without wasting water | Dashboard, Pump, Automation |
| **Field technician** | Diagnose connectivity & device issues | Diagnostics, Alerts |
| **Maintenance engineer** | Review history & tune thresholds | History, Settings |

## User stories

- As an operator, I want to **see live soil moisture** so I know if irrigation is needed.
- As an operator, I want to **start and stop the pump manually** from my phone.
- As an operator, I want **auto mode to skip irrigation when rain is expected** so I conserve water.
- As an operator, I want **alerts when tank level is low** so I can refill in time.
- As an operator, I want an **emergency stop** that immediately halts the pump.
- As an operator, I want the system to **prevent unsafe pump operation** (low tank, offline, already running, e-stopped).
- As an operator, I want **historical charts** so I can see trends over time.
- As a technician, I want to **check network diagnostics** from the app to confirm the device and backend are reachable.
- As an engineer, I want to **adjust moisture/rain/tank thresholds** so automation matches my crop.

## Acceptance criteria (samples)

**Live soil moisture**
- Dashboard shows the latest soil-moisture % and updates without a manual refresh.
- A connection indicator shows online/offline and "no server" states.

**Manual pump control**
- "Start Pump" is disabled (and blocked server-side) when offline, e-stopped,
  tank-low, or already running, with a reason shown.
- "Stop Pump" stops the pump and logs a `pump_events` row.

**Auto irrigation**
- In AUTO mode, the engine logs an `IRRIGATE`/`SKIP` decision with a reason and
  starts the pump only when all rules pass.
- Changing thresholds immediately affects the next decision.

**Alerts**
- Low soil moisture, low tank, pump overrun, device disconnect, emergency stop,
  and weather-unavailable conditions each generate a stored alert.
- Alerts can be acknowledged.

## Screen list

| # | Screen | Purpose |
| - | ------ | ------- |
| 1 | Splash | Logo + app name while state hydrates |
| 2 | Demo Operator | "Continue as Demo Operator" (no login in v1) |
| 3 | Dashboard | Live soil moisture, pump, tank, weather, mode, latest alert |
| 4 | Pump Control | Start/Stop, Manual/Auto, Emergency Stop/Reset, runtime, valve, safety |
| 5 | Automation | Thresholds, auto toggle, live + latest decisions |
| 6 | Alerts | List, filter, acknowledge |
| 7 | History | Soil, tank, pump-runtime, temperature charts |
| 8 | Settings | Device profile + thresholds |
| 9 | Network Diagnostics | Java native module: network, reachability, device info |

## Out of scope (v1)

- **Authentication** - uses a "Continue as Demo Operator" flow. The app stores no
  private user data in v1; auth can be added later for multi-user / multi-farm /
  cloud accounts.
- **Multiple devices in the UI** - the schema supports many; the app focuses on
  the one demo device.
- **iOS native module** - diagnostics module is Android/Java only.
