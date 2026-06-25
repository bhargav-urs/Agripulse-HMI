import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Card, MetricTile, Pill, Screen, SectionHeader } from '../components/ui';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { colors, radius, spacing, typography } from '../theme';
import { DeviceApi } from '../services/api';
import { ENV } from '../config/env';
import { useDeviceStore } from '../store/useDeviceStore';
import { TelemetryRow } from '../types';
import { irrigationEventCount, pumpRuntimePerDay, series } from '../utils/history';

type Range = '6h' | '24h' | '7d';

export const HistoryScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const chartWidth = width - spacing.lg * 2 - spacing.lg * 2; // screen + card padding

  const [range, setRange] = useState<Range>('24h');
  const [rows, setRows] = useState<TelemetryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (r: Range) => {
    setLoading(true);
    try {
      const data = await DeviceApi.getTelemetry(r);
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [range, load]);

  // Live updates: append each incoming telemetry reading (incl. manual sim
  // changes) so the charts grow in real time without waiting for a DB refresh.
  const liveTelemetry = useDeviceStore((s) => s.telemetry);
  const liveAt = useDeviceStore((s) => s.lastTelemetryAt);
  useEffect(() => {
    if (!liveTelemetry || !liveAt) return;
    setRows((prev) => {
      const lastAt = prev.length ? Date.parse(prev[prev.length - 1].createdAt) : 0;
      if (liveAt <= lastAt) return prev; // already captured
      const point: TelemetryRow = {
        id: `live-${liveAt}`,
        deviceId: ENV.DEVICE_ID,
        soilMoisture: liveTelemetry.soilMoisture,
        temperature: liveTelemetry.temperature,
        humidity: liveTelemetry.humidity,
        tankLevel: liveTelemetry.tankLevel,
        pumpStatus: liveTelemetry.pumpStatus,
        valveStatus: liveTelemetry.valveStatus,
        emergencyStop: liveTelemetry.emergencyStop,
        createdAt: new Date(liveAt).toISOString(),
      };
      const next = [...prev, point];
      return next.length > 600 ? next.slice(-600) : next;
    });
  }, [liveAt, liveTelemetry]);

  const soil = series(rows, 'soilMoisture');
  const tank = series(rows, 'tankLevel');
  const temp = series(rows, 'temperature');
  const runtimeBars = pumpRuntimePerDay(rows);
  const events = irrigationEventCount(rows);

  return (
    <Screen
      title="History"
      subtitle={`${rows.length} readings`}
      right={<ConnectionBadge />}
      refreshing={loading}
      onRefresh={() => load(range)}>
      <View style={styles.rangeRow}>
        {(['6h', '24h', '7d'] as Range[]).map((r) => (
          <Pressable
            key={r}
            onPress={() => setRange(r)}
            style={[styles.range, range === r && styles.rangeActive]}>
            <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>{r}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.tiles}>
        <MetricTile label="Irrigation events" value={String(events)} icon="💦" accent={colors.accent} />
        <MetricTile
          label="Readings"
          value={String(rows.length)}
          icon="📈"
          accent={colors.primary}
          hint={`range ${range}`}
        />
      </View>

      <SectionHeader title="Soil Moisture" />
      <Card>
        <LineChart data={soil} width={chartWidth} color={colors.moisture} fixedMin={0} fixedMax={100} />
      </Card>

      <SectionHeader title="Tank Level" />
      <Card>
        <LineChart data={tank} width={chartWidth} color={colors.tank} fixedMin={0} fixedMax={100} />
      </Card>

      <SectionHeader title="Pump Runtime / Day (min)" />
      <Card>
        <BarChart data={runtimeBars} width={chartWidth} color={colors.primary} unit="m" />
      </Card>

      <SectionHeader title="Temperature (°C)" />
      <Card>
        <LineChart data={temp} width={chartWidth} color={colors.temp} unit="°" />
      </Card>

      <View style={styles.legendRow}>
        <Pill label="● Live + PostgreSQL history" color={colors.ok} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  rangeRow: { flexDirection: 'row', gap: spacing.sm },
  range: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeActive: { backgroundColor: `${colors.primary}22`, borderColor: colors.primary },
  rangeText: { ...typography.label, color: colors.textMuted },
  rangeTextActive: { color: colors.primary },
  tiles: { flexDirection: 'row', gap: spacing.md },
  legendRow: { alignItems: 'center', marginTop: spacing.sm },
});
