import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../theme';

interface LogoProps {
  size?: number;
}

/** AgriPulse mark: a water droplet with an ECG-style "pulse" line through it. */
export const Logo: React.FC<LogoProps> = ({ size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path
      d="M50 8 C50 8 80 42 80 64 A30 30 0 1 1 20 64 C20 42 50 8 50 8 Z"
      fill={`${colors.accent}22`}
      stroke={colors.accent}
      strokeWidth={3}
    />
    <Path
      d="M28 66 H42 L48 52 L56 78 L62 66 H74"
      fill="none"
      stroke={colors.primary}
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx={74} cy={66} r={3.4} fill={colors.primary} />
  </Svg>
);
