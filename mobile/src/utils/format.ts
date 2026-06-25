import { AlertSeverity, AlertType } from '../types';
import { colors } from '../theme';

export function pct(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return '--%';
  return `${value.toFixed(digits)}%`;
}

export function degrees(value: number | null | undefined): string {
  if (value == null) return '--°';
  return `${value.toFixed(1)}°C`;
}

export function timeAgo(epochMs: number | null | undefined): string {
  if (!epochMs) return 'never';
  const secs = Math.floor((Date.now() - epochMs) / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function severityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'CRITICAL':
      return colors.critical;
    case 'WARNING':
      return colors.warning;
    default:
      return colors.info;
  }
}

const ALERT_LABELS: Record<AlertType, string> = {
  LOW_SOIL_MOISTURE: 'Low Soil Moisture',
  LOW_TANK_LEVEL: 'Low Tank Level',
  PUMP_OVERRUN: 'Pump Overrun',
  DEVICE_DISCONNECTED: 'Device Disconnected',
  EMERGENCY_STOP: 'Emergency Stop',
  WEATHER_UNAVAILABLE: 'Weather Unavailable',
};

export function alertLabel(type: AlertType): string {
  return ALERT_LABELS[type] ?? type;
}

const ALERT_ICONS: Record<AlertType, string> = {
  LOW_SOIL_MOISTURE: '🌱',
  LOW_TANK_LEVEL: '🛢️',
  PUMP_OVERRUN: '⏱️',
  DEVICE_DISCONNECTED: '📡',
  EMERGENCY_STOP: '🛑',
  WEATHER_UNAVAILABLE: '🌦️',
};

export function alertIcon(type: AlertType): string {
  return ALERT_ICONS[type] ?? '⚠️';
}
