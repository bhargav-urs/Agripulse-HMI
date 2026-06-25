import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../theme';

interface PillProps {
  label: string;
  color?: string;
  filled?: boolean;
}

export const Pill: React.FC<PillProps> = ({ label, color = colors.primary, filled = false }) => (
  <View
    style={[
      styles.pill,
      filled
        ? { backgroundColor: color, borderColor: color }
        : { backgroundColor: `${color}1A`, borderColor: `${color}55` },
    ]}>
    <Text style={[styles.text, { color: filled ? '#08111F' : color }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
});
