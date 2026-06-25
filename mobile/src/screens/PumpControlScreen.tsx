import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Card,
  ConfirmModal,
  ControlButton,
  Led,
  Pill,
  Screen,
  SectionHeader,
} from '../components/ui';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { colors, radius, spacing, typography } from '../theme';
import { useDeviceStore } from '../store/useDeviceStore';
import { socketService } from '../services/socket';
import { formatDuration } from '../utils/format';

const RUNTIME_OPTIONS = [
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '3m', value: 180 },
  { label: '5m', value: 300 },
];

export const PumpControlScreen: React.FC = () => {
  const pump = useDeviceStore((s) => s.pump);
  const mode = useDeviceStore((s) => s.mode);
  const online = useDeviceStore((s) => s.online);
  const emergencyStop = useDeviceStore((s) => s.emergencyStop);
  const telemetry = useDeviceStore((s) => s.telemetry);
  const settings = useDeviceStore((s) => s.settings);

  const [runtime, setRuntime] = useState(60);
  const [confirm, setConfirm] = useState<null | 'start' | 'estop'>(null);

  const tankLow = settings ? (telemetry?.tankLevel ?? 0) < settings.tankMinThreshold : false;

  // Safety warnings shown to the operator (mirrors backend rules).
  const warnings = useMemo(() => {
    const w: string[] = [];
    if (!online) w.push('Device is offline - control unavailable.');
    if (emergencyStop) w.push('Emergency stop is active - reset before starting.');
    if (tankLow) w.push('Tank level is below the safe minimum.');
    if (mode === 'AUTO') w.push('Auto mode is on - automation may also control the pump.');
    return w;
  }, [online, emergencyStop, tankLow, mode]);

  const canStart = online && !emergencyStop && !tankLow && !pump.status;

  const doStart = () => {
    socketService.startPump(runtime);
    setConfirm(null);
  };
  const doStop = () => socketService.stopPump();
  const doEmergencyStop = () => {
    socketService.emergencyStop();
    setConfirm(null);
  };
  const doEmergencyReset = () => socketService.emergencyReset();
  const selectMode = (target: 'MANUAL' | 'AUTO') => {
    if (target === mode) return;
    useDeviceStore.getState().setMode(target); // optimistic - instant UI feedback
    socketService.setMode(target); // backend confirms + broadcasts
  };

  return (
    <Screen title="Pump Control" right={<ConnectionBadge />}>
      {/* Status panel */}
      <Card accent={pump.status ? colors.ok : colors.border}>
        <View style={styles.statusRow}>
          <View style={styles.ledBlock}>
            <Led on={pump.status} pulse={pump.status} color={colors.ok} size={22} />
            <Text style={styles.ledLabel}>PUMP</Text>
          </View>
          <View style={styles.ledBlock}>
            <Led on={telemetry?.valveStatus ?? false} color={colors.accent} size={22} />
            <Text style={styles.ledLabel}>VALVE</Text>
          </View>
          <View style={styles.ledBlock}>
            <Led on={emergencyStop} color={colors.critical} pulse={emergencyStop} size={22} />
            <Text style={styles.ledLabel}>E-STOP</Text>
          </View>
          <View style={styles.statusText}>
            <Text style={[styles.bigState, { color: pump.status ? colors.ok : colors.textMuted }]}>
              {pump.status ? 'RUNNING' : 'STOPPED'}
            </Text>
            {pump.status ? (
              <Text style={styles.runtime}>
                {pump.source ?? 'MANUAL'} · {formatDuration(pump.runtimeSeconds)}
              </Text>
            ) : null}
          </View>
        </View>
      </Card>

      {/* Mode switch */}
      <Card>
        <SectionHeader title="Operating Mode" />
        <View style={styles.modeSwitch}>
          {(['MANUAL', 'AUTO'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => selectMode(m)}
              style={[
                styles.modeOption,
                mode === m && { backgroundColor: m === 'AUTO' ? colors.accent : colors.primary },
              ]}>
              <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.modeHint}>
          {mode === 'AUTO'
            ? 'Automation decides when to irrigate based on soil, tank & weather.'
            : 'You control the pump manually.'}
        </Text>
      </Card>

      {/* Runtime selector */}
      <Card>
        <SectionHeader title="Pump Runtime" />
        <View style={styles.runtimeRow}>
          {RUNTIME_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setRuntime(opt.value)}
              style={[styles.chip, runtime === opt.value && styles.chipActive]}>
              <Text style={[styles.chipText, runtime === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.modeHint}>
          Auto-stops after {formatDuration(runtime)} (max {formatDuration(settings?.maxPumpRuntimeSeconds ?? 300)}).
        </Text>
      </Card>

      {/* Start / Stop */}
      <View style={styles.btnRow}>
        <ControlButton
          label="START PUMP"
          icon="▶"
          variant="primary"
          large
          disabled={!canStart}
          onPress={() => setConfirm('start')}
        />
        <ControlButton
          label="STOP PUMP"
          icon="■"
          variant="neutral"
          large
          disabled={!pump.status}
          onPress={doStop}
        />
      </View>

      {/* Emergency */}
      <SectionHeader title="Emergency" />
      <View style={styles.btnRow}>
        <ControlButton
          label="EMERGENCY STOP"
          icon="🛑"
          variant="danger"
          large
          disabled={emergencyStop}
          onPress={() => setConfirm('estop')}
        />
        <ControlButton
          label="RESET E-STOP"
          icon="↺"
          variant="warning"
          large
          disabled={!emergencyStop}
          onPress={doEmergencyReset}
        />
      </View>

      {/* Safety warnings */}
      {warnings.length > 0 ? (
        <Card accent={colors.warning} style={{ marginTop: spacing.sm }}>
          <SectionHeader title="Safety" />
          {warnings.map((w) => (
            <View key={w} style={styles.warnRow}>
              <Text style={styles.warnIcon}>⚠</Text>
              <Text style={styles.warnText}>{w}</Text>
            </View>
          ))}
        </Card>
      ) : (
        <Pill label="ALL SAFETY CHECKS PASSED" color={colors.ok} />
      )}

      <ConfirmModal
        visible={confirm === 'start'}
        title="Start pump?"
        message={`This will run the pump for ${formatDuration(runtime)} or until tank/runtime limits are reached.`}
        confirmLabel="Start"
        onConfirm={doStart}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        visible={confirm === 'estop'}
        title="Activate emergency stop?"
        message="This immediately halts the pump and locks out operation until you reset the emergency stop."
        confirmLabel="EMERGENCY STOP"
        danger
        onConfirm={doEmergencyStop}
        onCancel={() => setConfirm(null)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  ledBlock: { alignItems: 'center', gap: 4 },
  ledLabel: { ...typography.label, fontSize: 9, color: colors.textFaint },
  statusText: { flex: 1, alignItems: 'flex-end' },
  bigState: { fontSize: 22, fontWeight: '800' },
  runtime: { ...typography.body, color: colors.textMuted, fontSize: 12 },
  modeSwitch: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  modeOption: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  modeText: { ...typography.h3, color: colors.textMuted },
  modeTextActive: { color: '#08111F' },
  modeHint: { ...typography.body, color: colors.textFaint, fontSize: 12, marginTop: spacing.sm },
  runtimeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  chip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: `${colors.primary}22`, borderColor: colors.primary },
  chipText: { ...typography.h3, color: colors.textMuted },
  chipTextActive: { color: colors.primary },
  btnRow: { flexDirection: 'row', gap: spacing.md },
  warnRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginTop: 6 },
  warnIcon: { color: colors.warning },
  warnText: { ...typography.body, color: colors.text, flex: 1, fontSize: 13 },
});
