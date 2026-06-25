import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../../theme';

interface GaugeBarProps {
  label: string;
  value: number; // 0..100
  color?: string;
  /** optional threshold marker (e.g. min tank level) */
  threshold?: number;
  unit?: string;
}

export const GaugeBar: React.FC<GaugeBarProps> = ({
  label,
  value,
  color = colors.accent,
  threshold,
  unit = '%',
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={typography.label}>{label.toUpperCase()}</Text>
        <Text style={styles.value}>
          {value.toFixed(0)}
          {unit}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: color }]} />
        {threshold != null ? (
          <View style={[styles.threshold, { left: `${Math.min(100, threshold)}%` }]} />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  value: { ...typography.h3, color: colors.text },
  track: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: { height: '100%', borderRadius: radius.pill },
  threshold: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: colors.warning,
  },
});
