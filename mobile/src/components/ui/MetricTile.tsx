import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { colors, typography } from '../../theme';

interface MetricTileProps {
  label: string;
  value: string;
  icon?: string;
  accent?: string;
  hint?: string;
}

export const MetricTile: React.FC<MetricTileProps> = ({ label, value, icon, accent, hint }) => (
  <Card accent={accent} style={styles.tile}>
    <View style={styles.row}>
      <Text style={typography.label}>{label.toUpperCase()}</Text>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
    </View>
    <Text style={[typography.metric, accent ? { color: accent } : null]}>{value}</Text>
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </Card>
);

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: '46%', gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icon: { fontSize: 18 },
  hint: { ...typography.body, color: colors.textMuted, fontSize: 12 },
});
