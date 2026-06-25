import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../../theme';

interface CardProps extends ViewProps {
  accent?: string;
  padded?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export const Card: React.FC<CardProps> = ({ accent, padded = true, style, children, ...rest }) => {
  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        accent ? { borderLeftWidth: 3, borderLeftColor: accent } : null,
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: {
    padding: spacing.lg,
  },
});
