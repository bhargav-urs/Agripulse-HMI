import { Platform } from 'react-native';

/**
 * Backend connection config.
 *
 * IMPORTANT: an Android emulator cannot reach your machine's `localhost` -
 * it maps the host to the special IP `10.0.2.2`. A physical device must use
 * your machine's LAN IP (e.g. http://192.168.1.20:4000). Edit `LAN_HOST` below
 * for physical-device testing.
 */

// Set this to your computer's LAN IP when running on a *physical* device.
const LAN_HOST = '192.168.1.10';

// Android emulator -> 10.0.2.2, iOS simulator -> localhost.
const EMULATOR_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

// Flip to true when deploying to a real phone on the same Wi-Fi.
const USE_PHYSICAL_DEVICE = false;

const HOST = USE_PHYSICAL_DEVICE ? LAN_HOST : EMULATOR_HOST;
const PORT = 4000;

export const ENV = {
  /** REST base URL */
  API_BASE_URL: `http://${HOST}:${PORT}`,
  /** Socket.IO base URL (mobile/default namespace) */
  SOCKET_URL: `http://${HOST}:${PORT}`,
  /** Host + port the native diagnostics module pings */
  BACKEND_HOST: HOST,
  BACKEND_PORT: PORT,
  /** The demo device this app controls (matches the backend seed) */
  DEVICE_ID: 'demo-device-1',
} as const;
