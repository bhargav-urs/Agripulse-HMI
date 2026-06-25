import { NativeModules, Platform } from 'react-native';

/**
 * Typed wrapper around the Java Android native module `NetworkDiagnosticsModule`.
 * Falls back gracefully when the native module is unavailable (iOS / not built),
 * so the JS never throws just because the native side isn't present.
 */

export interface NetworkStatus {
  connected: boolean;
  type: string; // WIFI | CELLULAR | ETHERNET | NONE | UNKNOWN
  isWifi: boolean;
  isCellular: boolean;
  isMetered: boolean;
}

export interface ReachabilityResult {
  reachable: boolean;
  latencyMs: number;
  detail: string;
}

export interface HealthCheckResult {
  network: NetworkStatus;
  backend: ReachabilityResult;
  websocket: ReachabilityResult;
  deviceModel: string;
  androidVersion: string;
  checkedAt: number;
}

interface NativeModuleShape {
  getNetworkStatus(): Promise<NetworkStatus>;
  pingHost(host: string, port: number, timeoutMs: number): Promise<ReachabilityResult>;
  checkWebSocket(host: string, port: number, timeoutMs: number): Promise<ReachabilityResult>;
  runHealthCheck(host: string, port: number): Promise<HealthCheckResult>;
  getDeviceNetworkInfo(): Promise<{ deviceModel: string; androidVersion: string }>;
}

const native = NativeModules.NetworkDiagnosticsModule as NativeModuleShape | undefined;

export const isNativeDiagnosticsAvailable = (): boolean =>
  Platform.OS === 'android' && native != null;

const UNAVAILABLE: ReachabilityResult = {
  reachable: false,
  latencyMs: -1,
  detail: 'Native module unavailable (Android only)',
};

export const NativeDiagnostics = {
  available: isNativeDiagnosticsAvailable(),

  async getNetworkStatus(): Promise<NetworkStatus> {
    if (!native) {
      return { connected: false, type: 'UNKNOWN', isWifi: false, isCellular: false, isMetered: false };
    }
    return native.getNetworkStatus();
  },

  async pingBackend(host: string, port: number, timeoutMs = 3000): Promise<ReachabilityResult> {
    if (!native) return UNAVAILABLE;
    return native.pingHost(host, port, timeoutMs);
  },

  async checkWebSocket(host: string, port: number, timeoutMs = 3000): Promise<ReachabilityResult> {
    if (!native) return UNAVAILABLE;
    return native.checkWebSocket(host, port, timeoutMs);
  },

  async runHealthCheck(host: string, port: number): Promise<HealthCheckResult | null> {
    if (!native) return null;
    return native.runHealthCheck(host, port);
  },
};
