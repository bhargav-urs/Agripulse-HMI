import { TelemetryRow } from '../types';
import { BarDatum } from '../components/charts/BarChart';

/** Down-sample a numeric series to at most `maxPoints` points (keeps shape). */
export function downsample(values: number[], maxPoints = 60): number[] {
  if (values.length <= maxPoints) return values;
  const bucket = Math.ceil(values.length / maxPoints);
  const out: number[] = [];
  for (let i = 0; i < values.length; i += bucket) {
    const slice = values.slice(i, i + bucket);
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return out;
}

export function series(rows: TelemetryRow[], key: 'soilMoisture' | 'tankLevel' | 'temperature' | 'humidity'): number[] {
  return downsample(rows.map((r) => r[key]));
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Estimate pump runtime per day (minutes) from the telemetry series by summing
 * the time spans during which pumpStatus was true.
 */
export function pumpRuntimePerDay(rows: TelemetryRow[]): BarDatum[] {
  const perDay = new Map<string, number>(); // dayKey -> seconds
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    if (!prev.pumpStatus) continue;
    const dt = (Date.parse(rows[i].createdAt) - Date.parse(prev.createdAt)) / 1000;
    if (dt <= 0 || dt > 600) continue; // ignore gaps
    const d = new Date(prev.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    perDay.set(key, (perDay.get(key) ?? 0) + dt);
  }

  // Build last-7-days buckets (even if zero) for a stable axis.
  const out: BarDatum[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const minutes = Math.round((perDay.get(key) ?? 0) / 60);
    out.push({ label: DAY_LABELS[d.getDay()], value: minutes });
  }
  return out;
}

/** Count irrigation start events (pump transitions off->on). */
export function irrigationEventCount(rows: TelemetryRow[]): number {
  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i - 1].pumpStatus && rows[i].pumpStatus) count++;
  }
  return count;
}
