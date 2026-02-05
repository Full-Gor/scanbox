export interface WifiNetwork {
  ssid: string;
  bssid: string;
  level: number;
  frequency: number;
  capabilities: string;
  timestamp: number;
}

export interface NetworkDevice {
  ip: string;
  hostname: string | null;
  mac: string | null;
  vendor: string | null;
  isServer: boolean;
}

export interface ScanHistoryItem {
  id: string;
  timestamp: string;
  networks: WifiNetwork[];
  networkCount: number;
}

export interface DeviceScanResult {
  serverIP: string;
  subnet: string;
  devices: NetworkDevice[];
  scannedAt: string;
}
