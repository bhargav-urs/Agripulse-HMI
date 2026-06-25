import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../../theme';

interface StepperProps {
  label: string;
  value: number;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  accent?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  label,
  value,
  unit = '',
  step = 1,
  min = 0,
  max = 100,
  onChange,
  accent = colors.primary,
}) => {
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 10) / 10));
  const inc = () => onChange(Math.min(max, Math.round((value + step) * 10) / 10));

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={typography.label}>{label.toUpperCase()}</Text>
        <Text style={[styles.value, { color: accent }]}>
          {value}
          {unit}
        </Text>
      </View>
      <View style={styles.controls}>
        <Pressable style={[styles.btn, { borderColor: accent }]} onPress={dec}>
          <Text style={[styles.btnText, { color: accent }]}>−</Text>
        </Pressable>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${((value - min) / (max - min || 1)) * 100}%`, backgroundColor: accent },
            ]}
          />
        </View>
        <Pressable style={[styles.btn, { borderColor: accent }]} onPress={inc}>
          <Text style={[styles.btnText, { color: accent }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 8, marginVertical: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  value: { fontSize: 18, fontWeight: '800' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  btnText: { fontSize: 22, fontWeight: '800', marginTop: -2 },
  track: { flex: 1, height: 8, borderRadius: 999, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
});
