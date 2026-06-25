/** Socket.IO event names - must match backend/src/constants/events.ts (mobile namespace). */

export const SERVER_EVENTS = {
  TELEMETRY_UPDATE: 'telemetry:update',
  PUMP_STATUS: 'pump:status',
  ALERT_NEW: 'alert:new',
  DEVICE_CONNECTION: 'device:connection',
  AUTOMATION_DECISION: 'automation:decision',
  MODE_CHANGED: 'mode:changed',
  WEATHER_UPDATE: 'weather:update',
  COMMAND_ACK: 'command:ack',
} as const;

export const CLIENT_EVENTS = {
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  PUMP_START: 'pump:start',
  PUMP_STOP: 'pump:stop',
  MODE_SET: 'mode:set',
  EMERGENCY_STOP: 'emergency:stop',
  EMERGENCY_RESET: 'emergency:reset',
  SETTINGS_UPDATE: 'settings:update',
} as const;
