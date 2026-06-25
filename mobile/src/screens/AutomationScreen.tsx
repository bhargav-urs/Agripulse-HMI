import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, ControlButton, Pill, Screen, SectionHeader, Stepper } from '../components/ui';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { colors, radius, spacing, typography } from '../theme';
import { useDeviceStore } from '../store/useDeviceStore';
import { DeviceApi } from '../services/api';
import { socketService } from '../services/socket';
import { previewDecision } from '../utils/automationPreview';
import { formatDuration, timeAgo } from '../utils/format';

export const AutomationScreen: React.FC = () => {
  const mode = useDeviceStore((s) => s.mode);
  const settings = useDeviceStore((s) => s.settings);
  const telemetry = useDeviceStore((s) => s.telemetry);
  const weather = useDeviceStore((s) => s.weather);
  const online = useDeviceStore((s) => s.online);
  const emergencyStop = useDeviceStore((s) => s.emergencyStop);
  const pump = useDeviceStore((s) => s.pump);
  const latestDecision = useDeviceStore((s) => s.latestDecision);

  // Local editable copy of thresholds.
  const [moisture, setMoisture] = useState(30);
  const [rain, setRain] = useState(70);
  const [tank, setTank] = useState(20);
  const [maxRuntime, setMaxRuntime] = useState(300);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setMoisture(settings.moistureMinThreshold);
      setRain(settings.rainProbabilityThreshold);
      setTank(settings.tankMinThreshold);
      setMaxRuntime(settings.maxPumpRuntimeSeconds);
      setDirty(false);
    }
  }, [settings]);

  const onChange = (setter: (v: number) => void) => (v: number) => {
    setter(v);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await DeviceApi.updateSettings({
        moistureMinThreshold: moisture,
        rainProbabilityThreshold: rain,
        tankMinThreshold: tank,
        maxPumpRuntimeSeconds: maxRuntime,
      });
      useDeviceStore.getState().setSettings(updated);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleAuto = () => {
    const next = mode === 'AUTO' ? 'MANUAL' : 'AUTO';
    useDeviceStore.getState().setMode(next); // optimistic - instant UI feedback
    socketService.setMode(next);
  };

  const preview =
    settings && telemetry
      ? previewDecision({
          online,
          emergencyStop,
          pumpStatus: pump.status,
          soilMoisture: telemetry.soilMoisture,
          tankLevel: telemetry.tankLevel,
          rainProbability: weather?.rainProbability ?? null,
          settings: { ...settings, moistureMinThreshold: moisture, rainProbabilityThreshold: rain, tankMinThreshold: tank },
        })
      : null;

  return (
    <Screen title="Automation" right={<ConnectionBadge />}>
      {/* Auto toggle */}
      <Card accent={mode === 'AUTO' ? colors.accent : colors.border}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={typography.h3}>Auto Irrigation</Text>
            <Text style={styles.hint}>
              {mode === 'AUTO' ? 'Engine is evaluating rules in real time.' : 'Currently in manual mode.'}
            </Text>
          </View>
          <Pressable
            onPress={toggleAuto}
            style={[styles.switch, mode === 'AUTO' ? styles.switchOn : styles.switchOff]}>
            <View style={[styles.knob, mode === 'AUTO' ? styles.knobOn : styles.knobOff]} />
          </Pressable>
        </View>
      </Card>

      {/* Live decision preview */}
      {preview ? (
        <Card accent={preview.decision === 'IRRIGATE' ? colors.ok : colors.textFaint}>
          <SectionHeader title="If evaluated now" />
          <View style={styles.previewRow}>
            <Pill
              label={preview.decision}
              color={preview.decision === 'IRRIGATE' ? colors.ok : colors.offline}
              filled
            />
            <Text style={styles.previewReason}>{preview.reason}</Text>
          </View>
        </Card>
      ) : null}

      {/* Thresholds */}
      <Card>
        <SectionHeader title="Thresholds" />
        <Stepper
          label="Moisture minimum"
          value={moisture}
          unit="%"
          accent={colors.moisture}
          onChange={onChange(setMoisture)}
        />
        <Stepper
          label="Rain probability max"
          value={rain}
          unit="%"
          accent={colors.rain}
          onChange={onChange(setRain)}
        />
        <Stepper
          label="Tank minimum"
          value={tank}
          unit="%"
          accent={colors.tank}
          onChange={onChange(setTank)}
        />
        <Stepper
          label="Max pump runtime"
          value={maxRuntime}
          unit="s"
          step={30}
          min={30}
          max={1800}
          accent={colors.warning}
          onChange={onChange(setMaxRuntime)}
        />
        <ControlButton
          label={dirty ? 'Save Thresholds' : 'Saved'}
          variant={dirty ? 'primary' : 'neutral'}
          disabled={!dirty}
          loading={saving}
          onPress={save}
        />
      </Card>

      {/* Latest decision from backend */}
      <SectionHeader title="Latest Decision" />
      {latestDecision ? (
        <Card accent={latestDecision.decision === 'IRRIGATE' ? colors.ok : colors.textFaint}>
          <View style={styles.previewRow}>
            <Pill
              label={latestDecision.decision}
              color={latestDecision.decision === 'IRRIGATE' ? colors.ok : colors.offline}
            />
            <Text style={styles.decisionTime}>{timeAgo(Date.parse(latestDecision.createdAt))}</Text>
          </View>
          <Text style={styles.decisionReason}>{latestDecision.reason}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>soil {latestDecision.soilMoisture.toFixed(0)}%</Text>
            <Text style={styles.meta}>tank {latestDecision.tankLevel.toFixed(0)}%</Text>
            <Text style={styles.meta}>
              rain {latestDecision.rainProbability != null ? `${latestDecision.rainProbability.toFixed(0)}%` : 'n/a'}
            </Text>
            <Text style={styles.meta}>pump {latestDecision.pumpStarted ? 'started' : 'idle'}</Text>
          </View>
        </Card>
      ) : (
        <Card>
          <Text style={styles.hint}>No automation decisions yet. Enable Auto mode to start.</Text>
        </Card>
      )}

      <Text style={styles.footnote}>
        Max runtime currently {formatDuration(maxRuntime)} · backend enforces all safety limits.
      </Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  hint: { ...typography.body, color: colors.textMuted, fontSize: 12, marginTop: 2 },
  switch: { width: 56, height: 32, borderRadius: 999, padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: colors.accent },
  switchOff: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
  knobOff: { alignSelf: 'flex-start', backgroundColor: colors.textFaint },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  previewReason: { ...typography.body, color: colors.text, flex: 1, fontSize: 13 },
  decisionTime: { ...typography.body, color: colors.textFaint, fontSize: 11 },
  decisionReason: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  meta: {
    ...typography.body,
    fontSize: 11,
    color: colors.textMuted,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  footnote: { ...typography.body, color: colors.textFaint, fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
});
