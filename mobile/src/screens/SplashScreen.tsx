import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../theme';
import { Logo } from '../components/Logo';

export const SplashScreen: React.FC = () => (
  <View style={styles.container}>
    <Logo size={96} />
    <Text style={styles.title}>AgriPulse</Text>
    <Text style={styles.subtitle}>Smart Irrigation HMI</Text>
    <ActivityIndicator style={{ marginTop: 28 }} color={colors.primary} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.h1, fontSize: 34, marginTop: 18, letterSpacing: 0.5 },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: 4 },
});
