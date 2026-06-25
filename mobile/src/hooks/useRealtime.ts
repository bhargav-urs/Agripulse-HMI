import { useEffect } from 'react';
import { socketService } from '../services/socket';
import { SERVER_EVENTS } from '../constants/events';
import { useDeviceStore } from '../store/useDeviceStore';
import { DeviceApi, WeatherApi } from '../services/api';
import {
  Alert,
  AutomationDecision,
  CommandAck,
  DeviceConnectionUpdate,
  PumpStatusUpdate,
  TelemetryUpdate,
} from '../types';

/**
 * Establishes the realtime pipeline: connects the socket, performs an initial
 * REST hydration, and routes every server event into the Zustand store.
 * Mounted once, high in the tree (the Main navigator).
 */
export function useRealtime(): void {
  useEffect(() => {
    const store = useDeviceStore.getState();
    const socket = socketService.connect();

    const initialLoad = async () => {
      try {
        const [latest, alerts] = await Promise.all([
          DeviceApi.getLatestState(),
          DeviceApi.getAlerts(),
        ]);
        store.hydrateFromLatest(latest);
        store.setAlerts(alerts);
        if (!latest.weather) {
          const w = await WeatherApi.getCurrent();
          store.setWeather(w);
        }
      } catch {
        // Backend not reachable yet - the socket will hydrate us when it connects.
      }
    };

    socket.on('connect', () => {
      useDeviceStore.getState().setSocketConnected(true);
      socketService.subscribe();
      void initialLoad();
    });

    socket.on('disconnect', () => {
      useDeviceStore.getState().setSocketConnected(false);
    });

    socket.on(SERVER_EVENTS.TELEMETRY_UPDATE, (u: TelemetryUpdate) => {
      useDeviceStore.getState().applyTelemetry(u);
    });
    socket.on(SERVER_EVENTS.PUMP_STATUS, (u: PumpStatusUpdate) => {
      useDeviceStore.getState().applyPumpStatus(u);
    });
    socket.on(SERVER_EVENTS.DEVICE_CONNECTION, (u: DeviceConnectionUpdate) => {
      useDeviceStore.getState().applyConnection(u.status === 'ONLINE');
    });
    socket.on(SERVER_EVENTS.ALERT_NEW, (a: Alert) => {
      useDeviceStore.getState().addAlert(a);
    });
    socket.on(SERVER_EVENTS.AUTOMATION_DECISION, (d: AutomationDecision) => {
      useDeviceStore.getState().applyDecision(d);
    });
    socket.on(SERVER_EVENTS.MODE_CHANGED, (m: { mode: 'MANUAL' | 'AUTO' }) => {
      useDeviceStore.getState().setMode(m.mode);
    });
    socket.on(
      SERVER_EVENTS.WEATHER_UPDATE,
      (w: { temperature: number; humidity: number; rainProbability: number; forecastSummary: string }) => {
        useDeviceStore.getState().setWeather({
          temperature: w.temperature,
          humidity: w.humidity,
          rainProbability: w.rainProbability,
          forecastSummary: w.forecastSummary,
        });
      },
    );
    socket.on(SERVER_EVENTS.COMMAND_ACK, (ack: CommandAck) => {
      useDeviceStore.getState().setAck(ack);
    });

    // If already connected (hot reload), trigger hydration immediately.
    if (socket.connected) {
      useDeviceStore.getState().setSocketConnected(true);
      socketService.subscribe();
      void initialLoad();
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off(SERVER_EVENTS.TELEMETRY_UPDATE);
      socket.off(SERVER_EVENTS.PUMP_STATUS);
      socket.off(SERVER_EVENTS.DEVICE_CONNECTION);
      socket.off(SERVER_EVENTS.ALERT_NEW);
      socket.off(SERVER_EVENTS.AUTOMATION_DECISION);
      socket.off(SERVER_EVENTS.MODE_CHANGED);
      socket.off(SERVER_EVENTS.WEATHER_UPDATE);
      socket.off(SERVER_EVENTS.COMMAND_ACK);
    };
  }, []);
}
