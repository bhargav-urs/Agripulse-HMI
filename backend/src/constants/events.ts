/**
 * Canonical Socket.IO namespaces, room names and event names shared across the
 * backend (and mirrored in the simulator + mobile clients).
 */

export const NAMESPACES = {
  /** Mobile operator clients connect here (the default namespace). */
  MOBILE: '/',
  /** The virtual IoT device(s) / simulator connect here. */
  DEVICE: '/device',
} as const;

/** Room a mobile client joins to receive a specific device's stream. */
export const deviceRoom = (deviceId: string): string => `device:${deviceId}`;

// -- Mobile namespace ---------------------------------------------------------

/** Server -> mobile app. */
export const MOBILE_OUT = {
  TELEMETRY_UPDATE: 'telemetry:update',
  PUMP_STATUS: 'pump:status',
  ALERT_NEW: 'alert:new',
  DEVICE_CONNECTION: 'device:connection',
  AUTOMATION_DECISION: 'automation:decision',
  MODE_CHANGED: 'mode:changed',
  WEATHER_UPDATE: 'weather:update',
  COMMAND_ACK: 'command:ack',
} as const;

/** Mobile app -> server. */
export const MOBILE_IN = {
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  PUMP_START: 'pump:start',
  PUMP_STOP: 'pump:stop',
  MODE_SET: 'mode:set',
  EMERGENCY_STOP: 'emergency:stop',
  EMERGENCY_RESET: 'emergency:reset',
  SETTINGS_UPDATE: 'settings:update',
} as const;

// -- Device namespace ---------------------------------------------------------

/** Device/simulator -> server. */
export const DEVICE_IN = {
  HELLO: 'device:hello',
  TELEMETRY: 'device:telemetry',
  STATUS: 'device:status',
} as const;

/** Server -> device/simulator. */
export const DEVICE_OUT = {
  COMMAND_PUMP: 'command:pump',
  COMMAND_EMERGENCY: 'command:emergency',
  COMMAND_VALVE: 'command:valve',
  CONFIG: 'config',
  KICKED: 'device:kicked',
} as const;
