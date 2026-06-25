import { io, Socket } from 'socket.io-client';
import { config, physics } from './config';
import { advance, initialState, temperatureAt } from './telemetryGenerator';
import { PumpController } from './pumpController';
import { FaultSimulator } from './faultSimulator';
import { DeviceConfig, EmergencyCommand, PumpCommand, SimState } from './types';

// Event names - must match the backend's constants/events.ts
const EVENTS = {
  HELLO: 'device:hello',
  TELEMETRY: 'device:telemetry',
  CONFIG: 'config',
  COMMAND_PUMP: 'command:pump',
  COMMAND_EMERGENCY: 'command:emergency',
  KICKED: 'device:kicked',
} as const;

function ts(): string {
  return new Date().toISOString().split('T')[1].replace('Z', '');
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class DeviceSimulator {
  private socket: Socket;
  private state: SimState;
  private pump: PumpController;
  private faults: FaultSimulator;
  private tickTimer?: NodeJS.Timeout;
  private suspended = false; // true while simulating a network drop

  /** Simulated hour-of-day (0-24), advances at config.timeScale. */
  private simHour: number;
  private readonly dtSeconds: number;

  constructor() {
    this.state = initialState(300);
    this.pump = new PumpController((m) => this.log(m));
    this.faults = new FaultSimulator(config.enableRandomFaults);
    this.dtSeconds = config.tickIntervalMs / 1000;

    const now = new Date();
    this.simHour = config.startHour ?? now.getHours() + now.getMinutes() / 60;
    // Seed temperature so the first reading is already on-curve.
    this.state.temperature = temperatureAt(this.simHour);

    this.socket = io(`${config.backendUrl}/device`, {
      reconnection: true,
      reconnectionDelay: 1500,
      transports: ['websocket', 'polling'],
    });

    this.wireSocket();
  }

  private log(msg: string): void {
    // eslint-disable-next-line no-console
    console.log(`\x1b[36m[${ts()}] [sim ${config.deviceId}]\x1b[0m ${msg}`);
  }

  private fmtHour(): string {
    const h = Math.floor(this.simHour) % 24;
    const m = Math.floor((this.simHour % 1) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private wireSocket(): void {
    this.socket.on('connect', () => {
      this.log(`Connected to backend (${config.backendUrl}/device) - saying hello`);
      this.socket.emit(EVENTS.HELLO, { deviceId: config.deviceId, firmware: config.firmware });
    });

    this.socket.on('disconnect', (reason) => this.log(`Disconnected from backend (${reason})`));
    this.socket.on('connect_error', (err) => this.log(`Connection error: ${err.message}`));

    this.socket.on(EVENTS.CONFIG, (cfg: DeviceConfig) => {
      this.state.emergencyStop = cfg.emergencyStop;
      this.state.maxPumpRuntimeSeconds = cfg.maxPumpRuntimeSeconds;
      this.log(
        `Config received - mode=${cfg.mode}, emergencyStop=${cfg.emergencyStop}, maxRuntime=${cfg.maxPumpRuntimeSeconds}s`,
      );
    });

    this.socket.on(EVENTS.COMMAND_PUMP, (cmd: PumpCommand) => {
      this.state = this.pump.applyPumpCommand(this.state, cmd);
      this.publish();
    });

    this.socket.on(EVENTS.COMMAND_EMERGENCY, (cmd: EmergencyCommand) => {
      this.state = this.pump.applyEmergencyCommand(this.state, cmd);
      this.publish();
    });

    this.socket.on(EVENTS.KICKED, (p: { reason?: string }) => {
      this.log(`Superseded by another instance (${p?.reason ?? 'duplicate'}). Exiting to avoid conflict.`);
      this.stop();
      process.exit(0);
    });
  }

  private tick(): void {
    if (this.suspended) return;

    // Advance simulated clock.
    this.simHour = (this.simHour + (this.dtSeconds * config.timeScale) / 3600) % 24;

    // Deterministic physics + pump self-safety.
    this.state = advance(this.state, this.simHour, this.dtSeconds);
    this.state = this.pump.enforceRuntime(this.state);

    this.publish();

    if (this.faults.shouldRandomlyDisconnect()) this.simulateDisconnect();
  }

  private publish(): void {
    if (!this.socket.connected) return;
    this.socket.emit(EVENTS.TELEMETRY, {
      deviceId: config.deviceId,
      soilMoisture: this.state.soilMoisture,
      temperature: this.state.temperature,
      humidity: this.state.humidity,
      tankLevel: this.state.tankLevel,
      pumpStatus: this.state.pumpStatus,
      valveStatus: this.state.valveStatus,
      emergencyStop: this.state.emergencyStop,
    });
  }

  private simulateDisconnect(durationMs?: number): void {
    const ms = durationMs ?? this.faults.disconnectDurationMs();
    this.log(`⚡ Simulating network drop for ${Math.round(ms / 1000)}s`);
    this.suspended = true;
    this.socket.disconnect();
    setTimeout(() => {
      this.suspended = false;
      this.socket.connect();
    }, ms);
  }

  // -- Manual controls (keyboard) --------------------------------------------

  private refillTank(): void {
    this.state.tankLevel = 100;
    this.log('🪣 Manual: tank refilled to 100%');
    this.publish();
  }
  private drainTank(): void {
    this.state.tankLevel = clamp(this.state.tankLevel - 15, 0, 100);
    this.log(`🪣 Manual: tank -> ${this.state.tankLevel}%`);
    this.publish();
  }
  private adjustSoil(delta: number): void {
    this.state.soilMoisture = clamp(
      this.state.soilMoisture + delta,
      physics.minSoilMoisture,
      physics.maxSoilMoisture,
    );
    this.log(`🌱 Manual: soil moisture -> ${this.state.soilMoisture}%`);
    this.publish();
  }
  private shiftTime(deltaHours: number): void {
    this.simHour = (this.simHour + deltaHours + 24) % 24;
    this.state = advance(this.state, this.simHour, 0);
    this.log(`🕑 Manual: time -> ${this.fmtHour()} (temp ${this.state.temperature}°C)`);
    this.publish();
  }
  private printStatus(): void {
    const s = this.state;
    this.log(
      `STATUS  time=${this.fmtHour()} temp=${s.temperature}°C soil=${s.soilMoisture}% tank=${s.tankLevel}% ` +
        `humidity=${s.humidity}% pump=${s.pumpStatus ? 'ON' : 'OFF'} valve=${s.valveStatus ? 'OPEN' : 'CLOSED'} ` +
        `eStop=${s.emergencyStop}`,
    );
  }

  private printControls(): void {
    // eslint-disable-next-line no-console
    console.log(
      [
        '',
        '\x1b[33m-- Manual sensor controls (keyboard) ---------------------------\x1b[0m',
        '  r  refill tank to 100%        e  drain tank by 15%',
        '  +  soil +5%                    -  soil -5%',
        '  ]  advance time +1h            [  rewind time -1h',
        '  d  trigger network drop        s  print status',
        '  ?  show this help              Ctrl+C  quit',
        '\x1b[33m----------------------------------------------------------------\x1b[0m',
        '',
      ].join('\n'),
    );
  }

  private setupKeyboard(): void {
    if (!process.stdin.isTTY) {
      this.log('(non-interactive terminal - keyboard controls disabled)');
      return;
    }
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key: string) => {
      switch (key) {
        case 'r': this.refillTank(); break;
        case 'e': this.drainTank(); break;
        case '+':
        case '=': this.adjustSoil(5); break;
        case '-':
        case '_': this.adjustSoil(-5); break;
        case ']': this.shiftTime(1); break;
        case '[': this.shiftTime(-1); break;
        case 'd': this.simulateDisconnect(); break;
        case 's': this.printStatus(); break;
        case '?':
        case 'h': this.printControls(); break;
        case '': // Ctrl+C
          this.stop();
          process.exit(0);
          break;
        default:
          break;
      }
    });
    this.printControls();
  }

  start(): void {
    this.log(
      `Starting simulator - tick ${config.tickIntervalMs}ms, timeScale ${config.timeScale}x, ` +
        `start ${this.fmtHour()}, randomFaults=${config.enableRandomFaults}`,
    );
    this.setupKeyboard();
    this.tickTimer = setInterval(() => this.tick(), config.tickIntervalMs);
  }

  stop(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    this.socket.disconnect();
  }
}
