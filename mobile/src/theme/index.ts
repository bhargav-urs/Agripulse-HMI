/**
 * AgriPulse HMI design tokens. The palette is an industrial control-room dark
 * theme: deep slate background, high-contrast status colours, "LED" accents.
 */

export const colors = {
  // Surfaces
  bg: '#0B1220',
  surface: '#131C2E',
  surfaceAlt: '#1B2740',
  border: '#27344F',

  // Text
  text: '#E6EDF7',
  textMuted: '#8C9BB5',
  textFaint: '#5A6B88',

  // Brand
  primary: '#22C55E', // AgriPulse green
  primaryDark: '#16A34A',
  accent: '#38BDF8', // water blue

  // Status
  ok: '#22C55E',
  info: '#38BDF8',
  warning: '#F59E0B',
  critical: '#EF4444',
  offline: '#64748B',

  // Resource gauges
  moisture: '#38BDF8',
  tank: '#0EA5E9',
  temp: '#FB923C',
  humidity: '#A78BFA',
  rain: '#60A5FA',

  // LED states
  ledOn: '#22C55E',
  ledOff: '#3F4A60',
  ledAlarm: '#EF4444',
  ledWarn: '#F59E0B',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 26, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 14, fontWeight: '400' as const, color: colors.text },
  label: { fontSize: 12, fontWeight: '600' as const, color: colors.textMuted, letterSpacing: 0.5 },
  metric: { fontSize: 34, fontWeight: '800' as const, color: colors.text },
  mono: { fontSize: 13, fontFamily: 'monospace', color: colors.textMuted },
} as const;

export const theme = { colors, spacing, radius, typography };
export type Theme = typeof theme;
