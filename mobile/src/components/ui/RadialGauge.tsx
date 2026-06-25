import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, typography } from '../../theme';

interface RadialGaugeProps {
  value: number; // 0..100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  centerLabel?: string;
}

/** A circular progress gauge (270° arc) built with react-native-svg. */
export const RadialGauge: React.FC<RadialGaugeProps> = ({
  value,
  size = 150,
  strokeWidth = 12,
  color = colors.moisture,
  label,
  centerLabel,
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75; // 270° sweep
  const arcLength = circumference * arcFraction;
  const progress = (clamped / 100) * arcLength;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* rotate so the gap is at the bottom */}
        <G rotation={135} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.surfaceAlt}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>
      <View style={styles.center}>
        <Text style={[typography.metric, { color }]}>
          {centerLabel ?? `${clamped.toFixed(0)}%`}
        </Text>
        {label ? <Text style={styles.label}>{label.toUpperCase()}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  label: { ...typography.label, marginTop: -2 },
});
