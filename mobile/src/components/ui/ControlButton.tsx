import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../theme';

type Variant = 'primary' | 'danger' | 'neutral' | 'warning';

interface ControlButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  large?: boolean;
  subtitle?: string;
}

const VARIANT_COLORS: Record<Variant, string> = {
  primary: colors.primary,
  danger: colors.critical,
  neutral: colors.surfaceAlt,
  warning: colors.warning,
};

export const ControlButton: React.FC<ControlButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  large,
  subtitle,
}) => {
  const base = VARIANT_COLORS[variant];
  const isNeutral = variant === 'neutral';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        large && styles.large,
        {
          backgroundColor: isNeutral ? colors.surfaceAlt : `${base}22`,
          borderColor: base,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={base} />
      ) : (
        <View style={styles.inner}>
          {icon ? <Text style={[styles.icon, { color: base }]}>{icon}</Text> : null}
          <View>
            <Text style={[styles.label, { color: isNeutral ? colors.text : base }, large && styles.labelLarge]}>
              {label}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  large: { minHeight: 76 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 22 },
  label: { fontSize: 15, fontWeight: '700' },
  labelLarge: { fontSize: 18 },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
