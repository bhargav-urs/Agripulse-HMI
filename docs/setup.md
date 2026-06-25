# AgriPulse HMI - Setup Guide

This guide covers running every component locally. There are two paths:

- **Path A - Docker** (fastest for the backend stack): Postgres + backend +
  simulator + Adminer with one command.
- **Path B - Manual** (best for active development): run each piece with `npm`.

The **mobile app** always runs on your machine via Android Studio.

---

## Prerequisites

| Tool | Version used | Needed for |
| ---- | ------------ | ---------- |
| Node.js | 22.x | backend, simulator, mobile tooling |
| npm | 10.x | package management |
| Docker + Compose | latest | Path A (Postgres) |
| PostgreSQL | 16 (or 14+) | Path B (if not using Docker) |
| Java JDK | 17+ | Android native module build |
| Android Studio | latest | mobile app (SDK, emulator) |

---

## Path A - Docker (backend stack)

```bash
# from the repo root
cp .env.example .env
docker compose up --build
```

This starts:
- **Postgres** -> `localhost:5432`
- **Adminer** (DB UI) -> http://localhost:8080  (server `postgres`, user/pass `agripulse`)
- **Backend** -> http://localhost:4000  (runs migrations on boot, self-seeds the demo device)
- **Simulator** -> connects to the backend and starts streaming telemetry

Verify:
```bash
curl http://localhost:4000/health
curl http://localhost:4000/devices/demo-device-1/latest
```

Stop with `Ctrl+C`; `docker compose down` to remove containers (add `-v` to wipe the DB volume).

---

## Path B - Manual (recommended for development)

### 1. PostgreSQL

Either start just the Docker Postgres:
```bash
docker compose up -d postgres
```
...or use a local install. If using a local server, create the role + database:
```bash
psql -h localhost -d postgres -c "CREATE ROLE agripulse LOGIN PASSWORD 'agripulse' CREATEDB;"
psql -h localhost -d postgres -c "CREATE DATABASE agripulse OWNER agripulse;"
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env            # DATABASE_URL points at localhost:5432
npm run prisma:generate
npm run prisma:migrate          # creates tables (first run: name it "init")
npm run db:seed                 # demo device + historical telemetry
npm run dev                     # http://localhost:4000
```

### 3. Simulator

```bash
cd simulator
npm install
cp .env.example .env            # BACKEND_URL=http://localhost:4000
npm run dev
```

You should now see telemetry in the backend logs and the demo device reported
`ONLINE`.

---

## Mobile app

> The app targets **Android** (the native module is Android/Java).

### 1. Toolchain

- Install **Android Studio**, the **Android SDK** (API 34+), and create an
  **emulator** (or enable USB debugging on a device).
- Ensure `ANDROID_HOME` is set and `adb` is on your `PATH`.
- JDK 17+.

### 2. Point the app at your backend

Edit [`mobile/src/config/env.ts`](../mobile/src/config/env.ts):

- **Android emulator** -> uses `10.0.2.2` automatically (the emulator's alias for
  your host's `localhost`). No change needed.
- **Physical device** -> set `USE_PHYSICAL_DEVICE = true` and `LAN_HOST` to your
  computer's LAN IP (e.g. `192.168.1.20`). The phone and computer must be on the
  same Wi-Fi, and the backend must be reachable (check your firewall).

### 3. Install + run

```bash
cd mobile
npm install
npm start            # terminal 1: Metro bundler
npm run android      # terminal 2: build + install on emulator/device
```

First build downloads Gradle dependencies and autolinks the native modules
(`react-native-screens`, `react-native-svg`, `gesture-handler`,
`async-storage`, and the custom `NetworkDiagnosticsModule`). Subsequent builds
are fast.

### 4. Using the app

1. Splash -> **Continue as Demo Operator**.
2. **Dashboard** updates live as the simulator streams telemetry.
3. **Pump** tab -> Start/Stop, switch Manual/Auto, Emergency Stop.
4. **Auto** tab -> tune thresholds, watch automation decisions.
5. **Network Diagnostics** (under the ⚙️ System tab -> "Network Diagnostics")
   calls the Java native module.

---

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| App shows "NO SERVER" | Backend not reachable. Emulator must use `10.0.2.2`; physical device needs `LAN_HOST` + same Wi-Fi. |
| `prisma migrate` fails | Confirm Postgres is up and `DATABASE_URL` is correct. |
| Simulator can't connect | Check `BACKEND_URL` and that the backend is listening on `:4000`. |
| Cleartext HTTP blocked on device | Debug builds allow cleartext; for a release build add a network-security config. |
| Native module "UNAVAILABLE" on Diagnostics | You're on iOS, or the app wasn't rebuilt after adding the module. Run `npm run android` again. |
| Charts empty | Run `npm run db:seed`, or let the simulator run a few minutes to accumulate data. |
