import { API_BASE_URL } from '../config';
import { WifiNetwork, ScanHistoryItem, DeviceScanResult, OpenPort, ConnectionGroup, ServiceStatus } from '../types';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // Envoyer un scan WiFi a l'historique
  async saveScanHistory(networks: WifiNetwork[]): Promise<ScanHistoryItem> {
    const response = await fetch(`${this.baseUrl}/network/wifi/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        networks,
        deviceInfo: { app: 'scanbox' }
      })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  // Recuperer l'historique des scans
  async getScanHistory(limit: number = 20): Promise<ScanHistoryItem[]> {
    const response = await fetch(`${this.baseUrl}/network/wifi/history?limit=${limit}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  // Scanner les appareils connectes au reseau
  async scanDevices(): Promise<DeviceScanResult> {
    const response = await fetch(`${this.baseUrl}/network/devices`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  // Infos reseau du serveur
  async getNetworkInfo(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/network/info`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  // Ports ouverts sur le serveur
  async getPorts(): Promise<{ ports: OpenPort[]; count: number }> {
    const response = await fetch(`${this.baseUrl}/network/ports`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  // Connexions actives
  async getConnections(): Promise<{ groups: ConnectionGroup[]; total: number }> {
    const response = await fetch(`${this.baseUrl}/network/connections`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  // Services systeme
  async getServices(): Promise<{ services: ServiceStatus[] }> {
    const response = await fetch(`${this.baseUrl}/network/services`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }
}

export const api = new ApiService();
