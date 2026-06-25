import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors, typography } from '../../theme';

interface LineChartProps {
  data: number[];
  width: number;
  height?: number;
  color?: string;
  unit?: string;
  fixedMin?: number;
  fixedMax?: number;
}

/** Lightweight auto-scaling line chart (react-native-svg). */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  width,
  height = 160,
  color = colors.moisture,
  unit = '%',
  fixedMin,
  fixedMax,
}) => {
  if (!data.length) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>No data yet</Text>
      </View>
    );
  }

  const padL = 34;
  const padR = 10;
  const padT = 12;
  const padB = 18;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const rawMin = Math.min(...data);
  const rawMax = Math.max(...data);
  const min = fixedMin ?? Math.floor(rawMin - (rawMax - rawMin) * 0.1 - 1);
  const max = fixedMax ?? Math.ceil(rawMax + (rawMax - rawMin) * 0.1 + 1);
  const span = max - min || 1;

  const x = (i: number) => padL + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
  const y = (v: number) => padT + chartH - ((v - min) / span) * chartH;

  const linePath = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${x(data.length - 1).toFixed(1)},${(padT + chartH).toFixed(1)} L${x(0).toFixed(1)},${(padT + chartH).toFixed(1)} Z`;

  const gridVals = [min, (min + max) / 2, max];

  return (
    <Svg width={width} height={height}>
      {gridVals.map((gv, idx) => (
        <React.Fragment key={idx}>
          <Line x1={padL} y1={y(gv)} x2={width - padR} y2={y(gv)} stroke={colors.border} strokeWidth={1} />
          <SvgText x={4} y={y(gv) + 4} fill={colors.textFaint} fontSize={9}>
            {gv.toFixed(0)}
          </SvgText>
        </React.Fragment>
      ))}
      <Path d={areaPath} fill={`${color}18`} />
      <Path d={linePath} stroke={color} strokeWidth={2} fill="none" />
      <Circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r={4} fill={color} />
      <SvgText
        x={width - padR}
        y={y(data[data.length - 1]) - 8}
        fill={color}
        fontSize={11}
        fontWeight="bold"
        textAnchor="end">
        {data[data.length - 1].toFixed(0)}
        {unit}
      </SvgText>
    </Svg>
  );
};

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...typography.body, color: colors.textFaint },
});
