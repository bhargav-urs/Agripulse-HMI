import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { Logo } from '../components/Logo';
import { ControlButton } from '../components/ui';
import { useOperatorStore } from '../store/useOperatorStore';

export const OperatorScreen: React.FC = () => {
  const enterAsDemo = useOperatorStore((s) => s.enterAsDemo);
  const [loading, setLoading] = useState(false);

  const onEnter = async () => {
    setLoading(true);
    await enterAsDemo();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <Logo size={88} />
        <Text style={styles.title}>AgriPulse HMI</Text>
        <Text style={styles.tagline}>Smart Irrigation Monitoring & Control</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.welcome}>Welcome, operator</Text>
        <Text style={styles.desc}>
          Monitor soil moisture, tank level, weather and pump status in real time. Control the pump
          manually or let weather-aware automation handle irrigation.
        </Text>

        <View style={styles.bullets}>
          {[
            ['📡', 'Live telemetry over WebSockets'],
            ['🎛️', 'Manual pump control + emergency stop'],
            ['🤖', 'Weather-aware auto irrigation'],
          ].map(([icon, label]) => (
            <View key={label} style={styles.bullet}>
              <Text style={styles.bulletIcon}>{icon}</Text>
              <Text style={styles.bulletText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <ControlButton
          label="Continue as Demo Operator"
          icon="->"
          onPress={onEnter}
          loading={loading}
          large
        />
        <Text style={styles.note}>No account needed · v1 demo mode</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, justifyContent: 'space-between' },
  hero: { alignItems: 'center', marginTop: spacing.xxl },
  title: { ...typography.h1, fontSize: 30, marginTop: spacing.md },
  tagline: { ...typography.body, color: colors.textMuted, marginTop: 4 },
  body: { gap: spacing.md },
  welcome: { ...typography.h2 },
  desc: { ...typography.body, color: colors.textMuted, lineHeight: 21 },
  bullets: { gap: spacing.sm, marginTop: spacing.sm },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bulletIcon: { fontSize: 20 },
  bulletText: { ...typography.body, color: colors.text },
  footer: { gap: spacing.sm },
  note: { ...typography.body, color: colors.textFaint, textAlign: 'center', fontSize: 12 },
});
