import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}

export const TextField: React.FC<TextFieldProps> = ({ label, value, onChangeText, placeholder }) => (
  <View style={styles.wrap}>
    <Text style={typography.label}>{label.toUpperCase()}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      style={styles.input}
    />
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: 6, marginVertical: 6 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
});
