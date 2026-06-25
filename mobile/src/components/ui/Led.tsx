import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

interface LedProps {
  on: boolean;
  color?: string;
  label?: string;
  /** pulse while on (e.g. pump running) */
  pulse?: boolean;
  size?: number;
}

/** An industrial "LED" status light with optional pulsing glow. */
export const Led: React.FC<LedProps> = ({
  on,
  color = colors.ledOn,
  label,
  pulse = false,
  size = 14,
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (on && pulse) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    anim.setValue(0);
    return undefined;
  }, [on, pulse, anim]);

  const ledColor = on ? color : colors.ledOff;
  const glowScale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const glowOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={styles.row}>
      <View style={[styles.wrap, { width: size * 2.4, height: size * 2.4 }]}>
        {on && pulse ? (
          <Animated.View
            style={[
              styles.glow,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: ledColor,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />
        ) : null}
        <View
          style={[
            styles.led,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: ledColor,
              shadowColor: ledColor,
              shadowOpacity: on ? 0.9 : 0,
              shadowRadius: on ? 6 : 0,
            },
          ]}
        />
      </View>
      {label ? <Text style={[styles.label, { color: on ? colors.text : colors.textFaint }]}>{label}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
  led: { shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  label: { fontSize: 13, fontWeight: '600' },
});
