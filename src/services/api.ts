import { API_BASE_URL } from '../config';
import { WifiNetwork, ScanHistoryItem, DeviceScanResult, OpenPort, ConnectionGroup, ServiceStatus, KnownDevice } from '../types';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async saveScanHistory(networks: WifiNetwork[]): Promise<ScanHistoryItem> {
    const response = await fetch(`${this.baseUrl}/network/wifi/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ networks, deviceInfo: { app: 'scanbox' } })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async getScanHistory(limit: number = 20): Promise<ScanHistoryItem[]> {
    const response = await fetch(`${this.baseUrl}/network/wifi/history?limit=${limit}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async scanDevices(): Promise<DeviceScanResult> {
    const response = await fetch(`${this.baseUrl}/network/devices`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async getNetworkInfo(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/network/info`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async getPorts(): Promise<{ ports: OpenPort[]; count: number }> {
    const response = await fetch(`${this.baseUrl}/network/ports`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async getConnections(): Promise<{ groups: ConnectionGroup[]; total: number }> {
    const response = await fetch(`${this.baseUrl}/network/connections`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async getServices(): Promise<{ services: ServiceStatus[] }> {
    const response = await fetch(`${this.baseUrl}/network/services`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  // Appareils connus (intrus)
  async getKnownDevices(): Promise<Record<string, KnownDevice>> {
    const response = await fetch(`${this.baseUrl}/network/known-devices`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async trustDevice(mac: string, trusted: boolean, name?: string): Promise<KnownDevice> {
    const response = await fetch(`${this.baseUrl}/network/known-devices/${encodeURIComponent(mac)}/trust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trusted, name })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  // Wake-on-LAN
  async wakeOnLan(mac: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/network/wol`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mac })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }
}

export const api = new ApiService();
