import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, GaugeBar, Led, MetricTile, Pill, RadialGauge, Screen, SectionHeader } from '../components/ui';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { colors, spacing, typography } from '../theme';
import { useDeviceStore } from '../store/useDeviceStore';
import { DeviceApi, WeatherApi } from '../services/api';
import { alertIcon, alertLabel, degrees, formatDuration, pct, severityColor, timeAgo } from '../utils/format';

export const DashboardScreen: React.FC = () => {
  const telemetry = useDeviceStore((s) => s.telemetry);
  const pump = useDeviceStore((s) => s.pump);
  const mode = useDeviceStore((s) => s.mode);
  const online = useDeviceStore((s) => s.online);
  const emergencyStop = useDeviceStore((s) => s.emergencyStop);
  const weather = useDeviceStore((s) => s.weather);
  const settings = useDeviceStore((s) => s.settings);
  const lastTelemetryAt = useDeviceStore((s) => s.lastTelemetryAt);
  const alerts = useDeviceStore((s) => s.alerts);
  const latestAlert = alerts[0];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [latest, w] = await Promise.all([DeviceApi.getLatestState(), WeatherApi.getCurrent()]);
      useDeviceStore.getState().hydrateFromLatest(latest);
      useDeviceStore.getState().setWeather(w);
      const a = await DeviceApi.getAlerts();
      useDeviceStore.getState().setAlerts(a);
    } catch {
      /* offline */
    } finally {
      setRefreshing(false);
    }
  }, []);

  const soil = telemetry?.soilMoisture ?? 0;
  const tank = telemetry?.tankLevel ?? 0;
  const tankLow = settings ? tank < settings.tankMinThreshold : false;

  return (
    <Screen
      title="AgriPulse"
      subtitle="North Field · Greenhouse Pump A"
      right={<ConnectionBadge />}
      refreshing={refreshing}
      onRefresh={onRefresh}>
      {emergencyStop ? (
        <Card style={styles.estop} accent={colors.critical}>
          <Text style={styles.estopText}>🛑 EMERGENCY STOP ACTIVE</Text>
        </Card>
      ) : null}

      {/* Soil moisture hero gauge + pump status */}
      <View style={styles.heroRow}>
        <Card style={styles.heroGauge}>
          <RadialGauge value={soil} color={colors.moisture} label="Soil moisture" size={150} />
          <Text style={styles.heroHint}>
            {settings ? `min ${settings.moistureMinThreshold}% · target ${settings.moistureTargetThreshold}%` : ' '}
          </Text>
        </Card>

        <Card style={styles.pumpCard} accent={pump.status ? colors.ok : colors.border}>
          <SectionHeader title="Pump" />
          <Led on={pump.status} pulse={pump.status} color={colors.ok} size={20} />
          <Text style={[styles.pumpState, { color: pump.status ? colors.ok : colors.textMuted }]}>
            {pump.status ? 'RUNNING' : 'STOPPED'}
          </Text>
          {pump.status ? (
            <Text style={styles.pumpMeta}>
              {pump.source ?? 'MANUAL'} · {formatDuration(pump.runtimeSeconds)}
            </Text>
          ) : (
            <Text style={styles.pumpMeta}>Valve {telemetry?.valveStatus ? 'open' : 'closed'}</Text>
          )}
          <View style={styles.modeRow}>
            <Pill label={mode} color={mode === 'AUTO' ? colors.accent : colors.primary} filled />
          </View>
        </Card>
      </View>

      {/* Tank level */}
      <Card accent={tankLow ? colors.critical : colors.tank}>
        <GaugeBar
          label="Tank level"
          value={tank}
          color={tankLow ? colors.critical : colors.tank}
          threshold={settings?.tankMinThreshold}
        />
        {tankLow ? <Text style={styles.tankWarn}>⚠ Below safe minimum - pump start blocked</Text> : null}
      </Card>

      {/* Environment metrics */}
      <SectionHeader title="Field & Weather" />
      <View style={styles.tileGrid}>
        <MetricTile label="Temperature" value={degrees(telemetry?.temperature)} icon="🌡️" accent={colors.temp} />
        <MetricTile label="Humidity" value={pct(telemetry?.humidity)} icon="💧" accent={colors.humidity} />
        <MetricTile
          label="Rain chance"
          value={weather ? pct(weather.rainProbability) : '--%'}
          icon="🌦️"
          accent={colors.rain}
          hint={weather?.forecastSummary}
        />
        <MetricTile
          label="Device"
          value={online ? 'Online' : 'Offline'}
          icon="📡"
          accent={online ? colors.ok : colors.offline}
          hint={`updated ${timeAgo(lastTelemetryAt)}`}
        />
      </View>

      {/* Latest alert */}
      <SectionHeader title="Latest Alert" />
      {latestAlert ? (
        <Card accent={severityColor(latestAlert.severity)}>
          <View style={styles.alertRow}>
            <Text style={styles.alertIcon}>{alertIcon(latestAlert.type)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{alertLabel(latestAlert.type)}</Text>
              <Text style={styles.alertMsg}>{latestAlert.message}</Text>
              <Text style={styles.alertTime}>{timeAgo(Date.parse(latestAlert.createdAt))}</Text>
            </View>
            <Pill label={latestAlert.severity} color={severityColor(latestAlert.severity)} />
          </View>
        </Card>
      ) : (
        <Card>
          <Text style={styles.noAlert}>✅ No alerts - system nominal</Text>
        </Card>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  estop: { backgroundColor: `${colors.critical}1A` },
  estopText: { color: colors.critical, fontWeight: '800', textAlign: 'center', letterSpacing: 1 },
  heroRow: { flexDirection: 'row', gap: spacing.md },
  heroGauge: { flex: 1.2, alignItems: 'center', gap: 6 },
  heroHint: { ...typography.body, color: colors.textFaint, fontSize: 11 },
  pumpCard: { flex: 1, gap: 4 },
  pumpState: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  pumpMeta: { ...typography.body, color: colors.textMuted, fontSize: 12 },
  modeRow: { marginTop: spacing.sm },
  tankWarn: { color: colors.critical, fontSize: 12, marginTop: 8, fontWeight: '600' },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  alertIcon: { fontSize: 24 },
  alertTitle: { ...typography.h3 },
  alertMsg: { ...typography.body, color: colors.textMuted, marginTop: 2 },
  alertTime: { ...typography.body, color: colors.textFaint, fontSize: 11, marginTop: 4 },
  noAlert: { ...typography.body, color: colors.ok, textAlign: 'center' },
});
