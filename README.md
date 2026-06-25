# AgriPulse HMI 🌱💧

**AgriPulse HMI** is a React Native mobile Human-Machine Interface (HMI) for a
**simulated smart irrigation pump controller**. It uses **WebSockets** for
real-time telemetry, **PostgreSQL** for persistence, **Node.js/Express** for the
backend API, a **virtual IoT device simulator** for pump and sensor behaviour,
and a **Java-based Android native module** for network diagnostics.

The app supports live monitoring, manual pump control, emergency stop,
weather-aware automatic irrigation, alerts, and historical analytics.

> ⚠️ No physical hardware is required. A backend simulator behaves like a real
> device by generating sensor readings and responding to pump-control commands.

---

## Table of contents

- [System architecture](#system-architecture)
- [Repository layout](#repository-layout)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
  - [1. Start PostgreSQL + backend + simulator (Docker)](#1-start-postgresql--backend--simulator-docker)
  - [2. Run the backend locally (without Docker)](#2-run-the-backend-locally-without-docker)
  - [3. Run the simulator](#3-run-the-simulator)
  - [4. Run the mobile app](#4-run-the-mobile-app)
- [Documentation](#documentation)
- [Feature checklist](#feature-checklist)
- [Known limitations](#known-limitations)

---

## System architecture

```
┌──────────────────────┐        WebSocket (mobile ns)        ┌───────────────────────┐
│  React Native App     │  ◀───────────  telemetry  ─────────▶ │                       │
│  (Operator HMI)       │  ───────────   commands  ─────────▶ │   Backend API Server  │
│                       │       REST (axios)                  │  Express + Socket.IO  │
└──────────────────────┘                                     │   Prisma + Automation │
                                                              │       Engine          │
┌──────────────────────┐    WebSocket (/device ns)            │                       │
│  Virtual Device       │  ───────────  telemetry  ─────────▶ │                       │
│  Simulator (IoT)      │  ◀───────────  commands  ─────────  │                       │
└──────────────────────┘                                     └───────────┬───────────┘
                                                                          │ Prisma
                                                              ┌───────────▼───────────┐
                                                              │     PostgreSQL DB     │
                                                              └───────────────────────┘
```

See [`docs/architecture.md`](docs/architecture.md) for the full diagram and data flows.

---

## Repository layout

```
AgriPulse/
├── backend/            Node.js + Express + Socket.IO + Prisma API server
├── simulator/          Virtual IoT pump/sensor device simulator
├── mobile/             React Native (TypeScript) operator HMI app
│   └── android/.../NetworkDiagnosticsModule.java   Java native module
├── docs/               Architecture, API, database, setup, user stories
├── docker-compose.yml  Postgres + backend + simulator + Adminer
└── README.md
```

---

## Tech stack

| Layer        | Technology                                                            |
| ------------ | --------------------------------------------------------------------- |
| Mobile       | React Native CLI, TypeScript, React Navigation, Zustand, Socket.IO client, Axios, react-native-chart-kit |
| Native       | Android Java module (`NetworkDiagnosticsModule`)                       |
| Backend      | Node.js, Express, TypeScript, Socket.IO, Prisma ORM                    |
| Database     | PostgreSQL 16                                                          |
| Simulator    | Node.js, TypeScript, Socket.IO client                                 |
| Weather      | Open-Meteo API (free, no key required)                                 |
| Tooling      | Docker, Docker Compose, Adminer                                       |

---

## Quick start

> Full instructions live in [`docs/setup.md`](docs/setup.md). The short version:

### 1. Start PostgreSQL + backend + simulator (Docker)

```bash
# from the repo root
cp .env.example .env
docker compose up --build
```

This launches:

- **PostgreSQL** on `localhost:5432`
- **Adminer** (DB UI) on http://localhost:8080
- **Backend API + WebSocket** on http://localhost:4000
- **Simulator** connected to the backend as device `demo-device-1`

The backend automatically runs migrations and seeds one demo device on boot.

### 2. Run the backend locally (without Docker)

```bash
# Start only Postgres in Docker...
docker compose up -d postgres

cd backend
npm install
cp .env.example .env          # DATABASE_URL points at localhost:5432
npm run prisma:generate
npm run prisma:migrate        # creates tables
npm run db:seed               # inserts the demo device + settings
npm run dev                   # http://localhost:4000
```

Health check:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/devices
```

### 3. Run the simulator

```bash
cd simulator
npm install
cp .env.example .env          # BACKEND_URL=http://localhost:4000
npm run dev
```

You should now see live telemetry flowing in the backend logs.

### 4. Run the mobile app

> Requires Android Studio + a configured Android SDK / emulator. See
> [`docs/setup.md`](docs/setup.md#mobile-app) for the full toolchain.

```bash
cd mobile
npm install

# Point the app at your machine's IP (emulator uses 10.0.2.2 for localhost)
cp .env.example .env

npm run android         # builds & launches on an emulator/device
# in another terminal, if needed:
npm start               # Metro bundler
```

---

## Documentation

| Document | Contents |
| -------- | -------- |
| [`docs/architecture.md`](docs/architecture.md) | System design, components, data-flow sequences |
| [`docs/api.md`](docs/api.md)                   | REST endpoints + WebSocket events |
| [`docs/database.md`](docs/database.md)         | PostgreSQL schema, tables, relationships |
| [`docs/setup.md`](docs/setup.md)               | Full local setup for every component |
| [`docs/user-stories.md`](docs/user-stories.md) | Product brief, personas, user stories, screen list |

---

## Feature checklist

- [x] Demo Operator entry (no login in v1)
- [x] Real-time dashboard over WebSockets
- [x] Manual pump control with safety rules
- [x] Emergency stop + reset
- [x] Weather-aware automatic irrigation engine
- [x] Alerts (low moisture, low tank, pump overrun, disconnect, e-stop, weather)
- [x] Historical charts (soil moisture, pump runtime, tank level)
- [x] PostgreSQL persistence (7 tables via Prisma)
- [x] Virtual IoT device simulator
- [x] Java Android native module for network diagnostics

---

## Known limitations

- **No authentication in v1** - the app uses a "Continue as Demo Operator" flow.
  Auth can be added later for multi-user / multi-farm / cloud accounts.
- **Single demo device** is seeded by default; the schema fully supports many.
- The **device is virtual** - values are realistic but synthetic.
- The mobile app targets **Android** (the native module is Android/Java only).


