# AgriPulse Device Simulator

A standalone virtual IoT pump/sensor controller. It connects to the backend over
the **same Socket.IO `/device` protocol a real controller would use**
(`device:hello` -> `device:telemetry`, receives `command:pump` / `command:emergency`),
so the backend cannot tell whether the device is simulated or real hardware.

```bash
npm install
cp .env.example .env
npm run dev
```

## Deterministic physics (no random noise)

Readings follow a smooth, reproducible model - there are no random sensor
glitches. Every simulated day is identical.

**Temperature** - a fixed daily curve (hour-of-day -> °C), linearly interpolated
with midnight wraparound:

| Time | 4am | 6am | 8am | 10am | noon | 3pm | 5pm | 7pm | 9pm | 12am |
| ---- | --- | --- | --- | ---- | ---- | --- | --- | --- | --- | ---- |
| °C   | 18  | 20  | 22  | 25   | 28   | 32  | 30  | 27  | 24  | 22   |

**Humidity** - inversely related to temperature (humid at cool night ~90%, drier
in the heat ~52%), with a small boost while pumping.

**Soil moisture**
- **Pump ON** (water reaching the soil): rises at a **constant rate**
  (`irrigationRatePerSec`).
- **Pump OFF**: falls at a **temperature-scaled rate** - fast in the afternoon
  heat (~4.8 %/min at 32 °C), slow at night (~1.0 %/min at 18 °C).

**Tank** - drains while pumping; auto-shutoff at 0 % (a dry pump can't move water).

All tuning lives in [`src/config.ts`](src/config.ts) (`TEMP_CURVE`, `physics`).

## Simulated clock

`SIM_TIME_SCALE` controls how fast simulated time advances:
- `1` = real time (temperature tracks the actual hour of day)
- `120` (default) = a full simulated day in ~12 minutes - good for demos, so you
  can watch the temperature rise and the soil dry faster as it heats up.

Set `SIM_START_HOUR` to pin the starting hour (otherwise it starts at the real
local hour).

## Manual controls (keyboard)

When run in an interactive terminal, you can drive the device by hand - great for
live demos:

| Key | Action |
| --- | ------ |
| `r` | Refill tank to 100 % |
| `e` | Drain tank by 15 % (triggers the low-tank alert + blocks pump start) |
| `+` / `-` | Soil moisture ± 5 % |
| `]` / `[` | Jump simulated time +1h / −1h |
| `d` | Trigger a network drop (device goes offline -> `DEVICE_DISCONNECTED` alert) |
| `s` | Print current status |
| `?` | Show the controls |
| `Ctrl+C` | Quit |

## Files

| File | Responsibility |
| ---- | -------------- |
| `src/deviceSimulator.ts` | Socket connection, tick loop, sim clock, keyboard controls |
| `src/telemetryGenerator.ts` | Deterministic physics (temperature curve, evaporation, humidity) |
| `src/pumpController.ts` | Pump/emergency interlocks + runtime self-limit |
| `src/faultSimulator.ts` | Optional network-drop faults |
| `src/config.ts` | Tuning: temperature curve, rates, clock speed |

## Why this matters (hardware-ready architecture)

To swap this for **real hardware**, you'd implement the same three events on an
ESP32 / Raspberry Pi (emit `device:hello` + `device:telemetry`, handle
`command:pump`). The backend, database, automation engine, and mobile app need
**no changes** - the simulator and a real controller are interchangeable behind
the protocol. Kill this process and the app shows the device offline within
seconds; that decoupling is the proof.
