# AgriPulse HMI - Architecture

## 1. Overview

AgriPulse HMI is a real-time mobile Human-Machine Interface for a **simulated**
smart-irrigation pump controller. It is built as four cooperating components:

| Component | Tech | Responsibility |
| --------- | ---- | -------------- |
| **Mobile app** | React Native + TypeScript | Operator HMI: live monitoring, pump control, automation config, alerts, history, diagnostics |
| **Backend API** | Node.js + Express + Socket.IO + Prisma | REST APIs, WebSocket pub-sub, automation engine, weather integration, persistence |
| **Device simulator** | Node.js + TypeScript + Socket.IO client | Acts like a real IoT pump controller: emits telemetry, reacts to commands |
| **Database** | PostgreSQL 16 | Stores telemetry, pump events, alerts, weather, automation decisions, settings |

## 2. Component diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                            React Native Mobile App                          │
│                                                                             │
│  Screens: Dashboard · Pump · Automation · Alerts · History · Settings ·     │
│           Network Diagnostics                                               │
│  State:   Zustand stores (operator, device runtime)                         │
│  Native:  NetworkDiagnosticsModule (Java)                                   │
└───────────────┬───────────────────────────────────┬─────────────────────────┘
                │ REST (axios)                        │ WebSocket (socket.io)
                │ GET/POST/PATCH                       │ mobile namespace "/"
                ▼                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                              Backend API Server                             │
│                                                                             │
│  Express routes ─▶ controllers ─▶ services                                  │
│  Socket.IO hub:  mobile ns "/"   ◀── commands / ──▶ broadcasts              │
│                  device ns "/device"  ◀── telemetry / commands ──▶          │
│  Pipelines:  telemetry ingest ─▶ persist ─▶ alerts ─▶ runtime safety        │
│                                           └▶ automation engine               │
│  Weather:    Open-Meteo poller ─▶ weather_snapshots + runtime cache          │
│  Prisma ORM ─────────────────────────────────────────────────────────────┐ │
└──────────────────────────────────────────────────────────────────────────┼─┘
                │ WebSocket (/device namespace)                              │
                ▼                                                            ▼
┌──────────────────────────────────┐                         ┌──────────────────────┐
│       Virtual Device Simulator    │                         │     PostgreSQL 16     │
│  telemetryGenerator (physics)     │                         │  7 tables (Prisma)    │
│  pumpController (interlocks)      │                         └──────────────────────┘
│  faultSimulator (drops/glitches)  │
└──────────────────────────────────┘
```

## 3. Why two Socket.IO namespaces?

- **`/` (mobile namespace)** - operator apps connect here. They `subscribe` to a
  device room (`device:<id>`), receive `telemetry:update`, `pump:status`,
  `alert:new`, `device:connection`, and `automation:decision`, and send control
  commands (`pump:start`, `mode:set`, ...).
- **`/device` namespace** - the simulator (a stand-in for a real IoT controller)
  connects here. It announces itself with `device:hello`, streams
  `device:telemetry`, and receives `command:pump` / `command:emergency`.

This cleanly separates *device traffic* from *operator traffic* and mirrors how a
real fleet backend would isolate hardware connections from client connections.

## 4. Key runtime concept: the in-memory device state

To keep safety checks and the automation engine fast (no DB round-trip per tick),
the backend maintains an in-memory `DeviceRuntimeState` per device
(`services/deviceState.service.ts`). It caches the latest telemetry, pump state,
mode, emergency-stop flag, settings snapshot, and the latest weather. PostgreSQL
remains the durable system of record; the cache is hydrated from it on boot and
on settings changes.

## 5. Data-flow sequences

### 5.1 Real-time telemetry

```
Simulator ──device:telemetry──▶ Backend
   Backend: update runtime state
            broadcast telemetry:update ──▶ Mobile app (dashboard updates live)
            persist (throttled ~10s, or on pump-state change) ──▶ PostgreSQL
            evaluate condition alerts (low moisture / low tank)
            enforce pump max-runtime safety
            run automation engine (if AUTO mode)
```

### 5.2 Manual pump control

```
Operator taps "Start Pump"
   Mobile ──pump:start {deviceId, runtimeSeconds}──▶ Backend
   Backend: checkPumpStartSafety()  (online? not e-stopped? tank ok? not running?)
            if blocked ──command:ack {ok:false, reason}──▶ Mobile (alert shown)
            else: send command:pump ──▶ Simulator
                  log pump_events row
                  broadcast pump:status ──▶ Mobile (LED turns green)
   Simulator: pump ON -> soil moisture rises, tank drains -> telemetry reflects it
```

### 5.3 Automatic irrigation

```
Telemetry tick (AUTO mode):
   Backend automation engine reads soil, tank, rain-probability + thresholds
   evaluateIrrigationRules() -> IRRIGATE | SKIP (with reason)
   persist automation_decisions row
   broadcast automation:decision ──▶ Mobile
   if IRRIGATE and safe -> startPump(source=AUTO)
```

Rules (all must hold to IRRIGATE): device online, no emergency stop, pump idle,
soil moisture below minimum, tank above minimum, rain probability below threshold
(or weather unavailable).

## 6. Safety model

Safety is enforced **server-side** (never trusting the client):

1. **Pump-start interlocks** - offline / emergency-stop / low-tank / already-running
   all block a start, with a human-readable reason returned via `command:ack`.
2. **Max-runtime cut-off** - the backend auto-stops the pump and raises a
   `PUMP_OVERRUN` alert when runtime exceeds `maxPumpRuntimeSeconds`. The simulator
   *also* self-limits as a backup (defence in depth).
3. **Emergency stop** - sets a latched flag, immediately halts the pump, and locks
   out starts until reset.
4. **Dry-tank shutoff** - the simulator physically stops moving water at 0% tank.

## 7. Technology decisions (and deviations from the brief)

| Area | Choice | Rationale |
| ---- | ------ | --------- |
| Mobile framework | React Native CLI (bare) | Required for the custom Java native module |
| State management | Zustand | Far less boilerplate than Redux for this size |
| Charts | `react-native-svg` (hand-built) | Avoids the unmaintained `react-native-chart-kit` and React 19 peer-dep issues; full control |
| Weather | Open-Meteo | Free, no API key, simple |
| Backend HTTP client | native `fetch` (Node 22) | No extra dependency for weather calls |
| DB enums | Postgres enums via Prisma | Stronger integrity than free-text columns |
| Native module language | Java (registered from Kotlin MainApplication) | Brief requires Java; RN 0.86 default app is Kotlin - they interoperate |

See [`api.md`](api.md) for the REST + WebSocket contract and
[`database.md`](database.md) for the schema.
