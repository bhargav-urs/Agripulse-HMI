import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, ControlButton, Led, Pill, Screen, SectionHeader } from '../components/ui';
import { colors, radius, spacing, typography } from '../theme';
import { ENV } from '../config/env';
import {
  NativeDiagnostics,
  NetworkStatus,
  ReachabilityResult,
} from '../services/nativeDiagnostics';
import { useDeviceStore } from '../store/useDeviceStore';
import { timeAgo } from '../utils/format';

interface Results {
  network?: NetworkStatus;
  backend?: ReachabilityResult;
  websocket?: ReachabilityResult;
  deviceModel?: string;
  androidVersion?: string;
}

export const DiagnosticsScreen: React.FC = () => {
  const socketConnected = useDeviceStore((s) => s.socketConnected);
  const [results, setResults] = useState<Results>({});
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<number | null>(null);
  const [lastSuccess, setLastSuccess] = useState<number | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    try {
      const health = await NativeDiagnostics.runHealthCheck(ENV.BACKEND_HOST, ENV.BACKEND_PORT);
      if (health) {
        setResults({
          network: health.network,
          backend: health.backend,
          websocket: health.websocket,
          deviceModel: health.deviceModel,
          androidVersion: health.androidVersion,
        });
        if (health.backend.reachable) setLastSuccess(Date.now());
      } else {
        // Fallback: native module unavailable (e.g. iOS) - use individual stubs.
        const network = await NativeDiagnostics.getNetworkStatus();
        const backend = await NativeDiagnostics.pingBackend(ENV.BACKEND_HOST, ENV.BACKEND_PORT);
        const websocket = await NativeDiagnostics.checkWebSocket(ENV.BACKEND_HOST, ENV.BACKEND_PORT);
        setResults({ network, backend, websocket });
      }
      setLastRun(Date.now());
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  const reachLed = (r?: ReachabilityResult) => (
    <Led on={!!r?.reachable} color={r?.reachable ? colors.ok : colors.critical} size={14} />
  );

  return (
    <Screen title="Network Diagnostics" scroll refreshing={running} onRefresh={run}>
      <Card accent={NativeDiagnostics.available ? colors.primary : colors.warning}>
        <View style={styles.headRow}>
          <Text style={typography.h3}>Java Native Module</Text>
          <Pill
            label={NativeDiagnostics.available ? 'LOADED' : 'UNAVAILABLE'}
            color={NativeDiagnostics.available ? colors.ok : colors.warning}
            filled={NativeDiagnostics.available}
          />
        </View>
        <Text style={styles.sub}>
          {NativeDiagnostics.available
            ? 'NetworkDiagnosticsModule (Android/Java) is bridged and responding.'
            : 'Native module not present on this platform - showing JS fallbacks.'}
        </Text>
      </Card>

      {/* Network status */}
      <SectionHeader title="Network Status" />
      <Card>
        <Row label="Connectivity">
          <Led on={!!results.network?.connected} color={results.network?.connected ? colors.ok : colors.critical} size={14} />
          <Text style={styles.value}>{results.network?.connected ? 'Connected' : 'No network'}</Text>
        </Row>
        <Row label="Type">
          <Text style={styles.value}>{results.network?.type ?? '-'}</Text>
        </Row>
        <Row label="Wi-Fi / Cellular">
          <Text style={styles.value}>
            {results.network ? `${results.network.isWifi ? 'Wi-Fi' : ''}${results.network.isCellular ? 'Cellular' : ''}` || 'Other' : '-'}
          </Text>
        </Row>
        <Row label="Metered">
          <Text style={styles.value}>{results.network?.isMetered ? 'Yes' : 'No'}</Text>
        </Row>
      </Card>

      {/* Reachability */}
      <SectionHeader title="Backend Reachability" />
      <Card>
        <Row label={`Backend (${ENV.BACKEND_HOST}:${ENV.BACKEND_PORT})`}>
          {reachLed(results.backend)}
          <Text style={styles.value}>
            {results.backend?.reachable ? `${results.backend.latencyMs}ms` : 'Unreachable'}
          </Text>
        </Row>
        <Row label="WebSocket port">
          {reachLed(results.websocket)}
          <Text style={styles.value}>
            {results.websocket?.reachable ? `${results.websocket.latencyMs}ms` : 'Unreachable'}
          </Text>
        </Row>
        <Row label="Socket (JS client)">
          <Led on={socketConnected} color={socketConnected ? colors.ok : colors.critical} size={14} />
          <Text style={styles.value}>{socketConnected ? 'Connected' : 'Disconnected'}</Text>
        </Row>
        <Row label="Last successful connection">
          <Text style={styles.value}>{lastSuccess ? timeAgo(lastSuccess) : 'never'}</Text>
        </Row>
      </Card>

      {/* Device info */}
      {results.deviceModel ? (
        <>
          <SectionHeader title="Device" />
          <Card>
            <Row label="Model">
              <Text style={styles.value}>{results.deviceModel}</Text>
            </Row>
            <Row label="Android">
              <Text style={styles.value}>{results.androidVersion}</Text>
            </Row>
          </Card>
        </>
      ) : null}

      <ControlButton label="Run Diagnostics" variant="primary" loading={running} onPress={run} />
      {lastRun ? <Text style={styles.ran}>Last run {timeAgo(lastRun)}</Text> : null}
    </Screen>
  );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <View style={styles.rowVal}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sub: { ...typography.body, color: colors.textMuted, fontSize: 12, marginTop: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { ...typography.body, color: colors.textMuted, flex: 1 },
  rowVal: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { ...typography.body, color: colors.text, fontWeight: '600' },
  ran: { ...typography.body, color: colors.textFaint, fontSize: 11, textAlign: 'center' },
});
