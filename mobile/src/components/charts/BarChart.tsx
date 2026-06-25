import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { colors, typography } from '../../theme';

export interface BarDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarDatum[];
  width: number;
  height?: number;
  color?: string;
  unit?: string;
}

/** Simple categorical bar chart (react-native-svg). */
export const BarChart: React.FC<BarChartProps> = ({
  data,
  width,
  height = 170,
  color = colors.primary,
  unit = '',
}) => {
  if (!data.length) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>No data yet</Text>
      </View>
    );
  }

  const padT = 14;
  const padB = 24;
  const padX = 8;
  const chartH = height - padT - padB;
  const chartW = width - padX * 2;
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = chartW / data.length;
  const barW = Math.min(slot * 0.6, 38);

  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const h = (d.value / max) * chartH;
        const cx = padX + i * slot + slot / 2;
        return (
          <React.Fragment key={i}>
            <Rect
              x={cx - barW / 2}
              y={padT + chartH - h}
              width={barW}
              height={Math.max(h, 1)}
              rx={4}
              fill={color}
              opacity={0.85}
            />
            <SvgText x={cx} y={padT + chartH - h - 4} fill={colors.textMuted} fontSize={9} textAnchor="middle">
              {d.value > 0 ? `${d.value}${unit}` : ''}
            </SvgText>
            <SvgText x={cx} y={height - 8} fill={colors.textFaint} fontSize={9} textAnchor="middle">
              {d.label}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...typography.body, color: colors.textFaint },
});
