import axios from 'axios';
import { ENV } from '../config/env';
import {
  Alert,
  AutomationDecision,
  DeviceLatestState,
  DeviceSettings,
  TelemetryRow,
  WeatherSnapshot,
} from '../types';

export const api = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 10000,
});

// Unwrap the backend's { data, ... } envelope.
function unwrap<T>(payload: { data: T }): T {
  return payload.data;
}

export const DeviceApi = {
  async getLatestState(deviceId = ENV.DEVICE_ID): Promise<DeviceLatestState> {
    const res = await api.get(`/devices/${deviceId}/latest`);
    return unwrap<DeviceLatestState>(res.data);
  },

  async updateProfile(
    profile: { name?: string; fieldName?: string; location?: string },
    deviceId = ENV.DEVICE_ID,
  ) {
    const res = await api.patch(`/devices/${deviceId}`, profile);
    return res.data.data;
  },

  async getConnection(deviceId = ENV.DEVICE_ID) {
    const res = await api.get(`/devices/${deviceId}/connection`);
    return res.data.data as {
      deviceId: string;
      status: string;
      lastTelemetryAt: string | null;
      pumpStatus: boolean;
      emergencyStop: boolean;
      mode: string;
    };
  },

  async getTelemetry(range = '24h', deviceId = ENV.DEVICE_ID): Promise<TelemetryRow[]> {
    const res = await api.get(`/devices/${deviceId}/telemetry`, { params: { range } });
    return res.data.data as TelemetryRow[];
  },

  async getAlerts(deviceId = ENV.DEVICE_ID): Promise<Alert[]> {
    const res = await api.get(`/devices/${deviceId}/alerts`);
    return res.data.data as Alert[];
  },

  async acknowledgeAlert(alertId: string): Promise<Alert> {
    const res = await api.patch(`/alerts/${alertId}/acknowledge`);
    return unwrap<Alert>(res.data);
  },

  async getSettings(deviceId = ENV.DEVICE_ID): Promise<DeviceSettings> {
    const res = await api.get(`/devices/${deviceId}/settings`);
    return unwrap<DeviceSettings>(res.data);
  },

  async updateSettings(
    patch: Partial<DeviceSettings>,
    deviceId = ENV.DEVICE_ID,
  ): Promise<DeviceSettings> {
    const res = await api.patch(`/devices/${deviceId}/settings`, patch);
    return unwrap<DeviceSettings>(res.data);
  },

  async getAutomationDecisions(deviceId = ENV.DEVICE_ID): Promise<AutomationDecision[]> {
    // Latest decision lives on the composite state; this is a convenience read.
    const state = await this.getLatestState(deviceId);
    return state.latestDecision ? [state.latestDecision] : [];
  },
};

export const WeatherApi = {
  async getCurrent(deviceId = ENV.DEVICE_ID): Promise<WeatherSnapshot | null> {
    const res = await api.get('/weather/current', { params: { deviceId } });
    return res.data.data as WeatherSnapshot | null;
  },
  async getForecast() {
    const res = await api.get('/weather/forecast');
    return res.data.data as {
      hourly: Array<{ time: string; temperature: number; rainProbability: number }>;
    };
  },
};

export async function getHealth() {
  const res = await api.get('/health');
  return res.data as {
    status: string;
    uptimeSeconds: number;
    database: string;
    connectedDevices: string[];
  };
}
