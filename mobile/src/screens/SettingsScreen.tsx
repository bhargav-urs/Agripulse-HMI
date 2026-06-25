import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, ControlButton, Screen, SectionHeader, Stepper, TextField } from '../components/ui';
import { colors, radius, spacing, typography } from '../theme';
import { useDeviceStore } from '../store/useDeviceStore';
import { useOperatorStore } from '../store/useOperatorStore';
import { DeviceApi } from '../services/api';
import { ENV } from '../config/env';
import { SystemStackParamList } from '../navigation/types';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<SystemStackParamList>>();
  const settings = useDeviceStore((s) => s.settings);
  const signOut = useOperatorStore((s) => s.signOut);

  const [name, setName] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [location, setLocation] = useState('');
  const [moisture, setMoisture] = useState(30);
  const [rain, setRain] = useState(70);
  const [tank, setTank] = useState(20);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Load profile + thresholds.
  useEffect(() => {
    void (async () => {
      try {
        const latest = await DeviceApi.getLatestState();
        setName(latest.device.name);
        setFieldName(latest.device.fieldName);
        setLocation(latest.device.location);
        if (latest.settings) {
          setMoisture(latest.settings.moistureMinThreshold);
          setRain(latest.settings.rainProbabilityThreshold);
          setTank(latest.settings.tankMinThreshold);
        }
      } catch {
        /* offline */
      }
    })();
  }, []);

  useEffect(() => {
    if (settings) {
      setMoisture(settings.moistureMinThreshold);
      setRain(settings.rainProbabilityThreshold);
      setTank(settings.tankMinThreshold);
    }
  }, [settings]);

  const save = async () => {
    setSaving(true);
    try {
      await DeviceApi.updateProfile({ name, fieldName, location });
      const updated = await DeviceApi.updateSettings({
        moistureMinThreshold: moisture,
        rainProbabilityThreshold: rain,
        tankMinThreshold: tank,
      });
      useDeviceStore.getState().setSettings(updated);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      Alert.alert('Save failed', 'Could not reach the backend. Check the connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Device Settings" scroll>
      <Card>
        <SectionHeader title="Device Profile" />
        <TextField label="Device name" value={name} onChangeText={setName} placeholder="Greenhouse Pump A" />
        <TextField label="Field name" value={fieldName} onChangeText={setFieldName} placeholder="North Field" />
        <TextField label="Location" value={location} onChangeText={setLocation} placeholder="Bengaluru, IN" />
        <Text style={styles.idText}>Device ID: {ENV.DEVICE_ID}</Text>
      </Card>

      <Card>
        <SectionHeader title="Automation Thresholds" />
        <Stepper label="Moisture minimum" value={moisture} unit="%" accent={colors.moisture} onChange={setMoisture} />
        <Stepper label="Rain probability max" value={rain} unit="%" accent={colors.rain} onChange={setRain} />
        <Stepper label="Tank minimum" value={tank} unit="%" accent={colors.tank} onChange={setTank} />
      </Card>

      <ControlButton label="Save Settings" variant="primary" loading={saving} onPress={save} />
      {savedAt ? <Text style={styles.saved}>✓ Saved at {savedAt}</Text> : null}

      {/* Navigate to network diagnostics (Java native module) */}
      <SectionHeader title="System" />
      <Pressable style={styles.navRow} onPress={() => navigation.navigate('Diagnostics')}>
        <View style={{ flex: 1 }}>
          <Text style={styles.navTitle}>📡 Network Diagnostics</Text>
          <Text style={styles.navSub}>Native Android module · connectivity & reachability</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Pressable style={[styles.navRow, styles.signOut]} onPress={() => void signOut()}>
        <Text style={styles.signOutText}>Sign out of demo session</Text>
      </Pressable>

      <Text style={styles.version}>AgriPulse HMI v1.0.0 · Demo mode</Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  idText: { ...typography.body, color: colors.textFaint, fontSize: 11, marginTop: spacing.sm },
  saved: { color: colors.ok, textAlign: 'center', fontSize: 12 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  navTitle: { ...typography.h3 },
  navSub: { ...typography.body, color: colors.textMuted, fontSize: 12, marginTop: 2 },
  chevron: { color: colors.textMuted, fontSize: 24 },
  signOut: { justifyContent: 'center', alignItems: 'center', borderColor: `${colors.critical}55` },
  signOutText: { color: colors.critical, fontWeight: '600' },
  version: { ...typography.body, color: colors.textFaint, fontSize: 11, textAlign: 'center', marginTop: spacing.md },
});
