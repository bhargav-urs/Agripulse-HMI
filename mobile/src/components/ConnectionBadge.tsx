import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Led } from './ui';
import { colors } from '../theme';
import { useDeviceStore } from '../store/useDeviceStore';

/** Compact online/offline + socket indicator shown in screen headers. */
export const ConnectionBadge: React.FC = () => {
  const online = useDeviceStore((s) => s.online);
  const socketConnected = useDeviceStore((s) => s.socketConnected);

  const label = !socketConnected ? 'NO SERVER' : online ? 'ONLINE' : 'OFFLINE';
  const color = !socketConnected ? colors.offline : online ? colors.ok : colors.critical;

  return (
    <View style={styles.wrap}>
      <Led on={socketConnected && online} color={color} pulse={socketConnected && online} size={10} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
});
