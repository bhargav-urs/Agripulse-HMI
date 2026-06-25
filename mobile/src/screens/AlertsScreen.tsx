import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Pill, Screen } from '../components/ui';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { colors, radius, spacing, typography } from '../theme';
import { useDeviceStore } from '../store/useDeviceStore';
import { DeviceApi } from '../services/api';
import { Alert as AlertType } from '../types';
import { alertIcon, alertLabel, formatClock, severityColor, timeAgo } from '../utils/format';

type Filter = 'ALL' | 'UNACK' | 'CRITICAL';

export const AlertsScreen: React.FC = () => {
  const alerts = useDeviceStore((s) => s.alerts);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const a = await DeviceApi.getAlerts();
      useDeviceStore.getState().setAlerts(a);
    } catch {
      /* offline */
    } finally {
      setRefreshing(false);
    }
  }, []);

  const acknowledge = async (alert: AlertType) => {
    useDeviceStore.getState().acknowledgeLocal(alert.id);
    try {
      await DeviceApi.acknowledgeAlert(alert.id);
    } catch {
      /* will resync on refresh */
    }
  };

  const filtered = useMemo(() => {
    switch (filter) {
      case 'UNACK':
        return alerts.filter((a) => !a.acknowledged);
      case 'CRITICAL':
        return alerts.filter((a) => a.severity === 'CRITICAL');
      default:
        return alerts;
    }
  }, [alerts, filter]);

  const unackCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <Screen
      title="Alerts"
      subtitle={`${unackCount} unacknowledged`}
      right={<ConnectionBadge />}
      refreshing={refreshing}
      onRefresh={onRefresh}>
      <View style={styles.filterRow}>
        {(['ALL', 'UNACK', 'CRITICAL'] as Filter[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filter, filter === f && styles.filterActive]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'UNACK' ? 'UNACKED' : f}
            </Text>
          </Pressable>
        ))}
      </View>

      {filtered.length === 0 ? (
        <Card>
          <Text style={styles.empty}>✅ No alerts to show</Text>
        </Card>
      ) : (
        filtered.map((alert) => (
          <Card
            key={alert.id}
            accent={severityColor(alert.severity)}
            style={alert.acknowledged ? styles.acked : undefined}>
            <View style={styles.row}>
              <Text style={styles.icon}>{alertIcon(alert.type)}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{alertLabel(alert.type)}</Text>
                  <Pill label={alert.severity} color={severityColor(alert.severity)} />
                </View>
                <Text style={styles.message}>{alert.message}</Text>
                <Text style={styles.time}>
                  {formatClock(alert.createdAt)} · {timeAgo(Date.parse(alert.createdAt))}
                </Text>
              </View>
            </View>
            {alert.acknowledged ? (
              <Text style={styles.ackedLabel}>✓ Acknowledged</Text>
            ) : (
              <Pressable style={styles.ackBtn} onPress={() => acknowledge(alert)}>
                <Text style={styles.ackBtnText}>Acknowledge</Text>
              </Pressable>
            )}
          </Card>
        ))
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filter: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: { backgroundColor: `${colors.primary}22`, borderColor: colors.primary },
  filterText: { ...typography.label, color: colors.textMuted },
  filterTextActive: { color: colors.primary },
  acked: { opacity: 0.6 },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: { fontSize: 24 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.h3, flex: 1 },
  message: { ...typography.body, color: colors.textMuted, marginTop: 2 },
  time: { ...typography.body, color: colors.textFaint, fontSize: 11, marginTop: 4 },
  empty: { ...typography.body, color: colors.ok, textAlign: 'center' },
  ackBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ackBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  ackedLabel: { color: colors.ok, fontSize: 12, marginTop: spacing.sm, fontWeight: '600' },
});
