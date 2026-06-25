import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';

interface ScreenProps {
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}

export const Screen: React.FC<ScreenProps> = ({
  title,
  subtitle,
  scroll = true,
  refreshing,
  onRefresh,
  right,
  children,
}) => {
  const header = title ? (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={typography.h1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }>
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={styles.content}>
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: 2 },
});
