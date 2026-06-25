import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useDeviceStore } from '../store/useDeviceStore';

const LABELS: Record<string, string> = {
  'pump:start': 'Start Pump',
  'pump:stop': 'Stop Pump',
  'mode:set': 'Change Mode',
  'emergency:stop': 'Emergency Stop',
  'emergency:reset': 'Reset Emergency Stop',
  'settings:update': 'Update Settings',
};

/**
 * Surfaces command acknowledgements from the backend. Failed/blocked commands
 * (e.g. a safety rejection) raise a native alert so the operator gets feedback.
 * Mounted once near the top of the tree.
 */
export function useAckToast(): void {
  const lastAck = useDeviceStore((s) => s.lastAck);
  const seen = useRef<string>('');

  useEffect(() => {
    if (!lastAck) return;
    const key = `${lastAck.event}-${lastAck.timestamp}`;
    if (key === seen.current) return;
    seen.current = key;

    if (!lastAck.ok) {
      Alert.alert(
        `${LABELS[lastAck.event] ?? 'Command'} blocked`,
        lastAck.reason ?? 'The command could not be completed.',
      );
    }
  }, [lastAck]);
}
