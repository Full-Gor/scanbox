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
  mdnsName?: string;
  os?: string | null;
  isNew?: boolean;
  trusted?: boolean;
  customName?: string;
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
  newDevices: number;
  scannedAt: string;
}

export interface OpenPort {
  port: number;
  name: string | null;
  process: string | null;
  state: string;
}

export interface ConnectionGroup {
  ip: string;
  count: number;
  processes: string[];
  ports: number[];
  localPorts: number[];
}

export interface ServiceStatus {
  name: string;
  active: boolean;
  status: string;
}

export interface SpeedTestResult {
  download: number;
  upload: number;
  latency: number | null;
  unit: string;
  testedAt: string;
}

export interface PingResult {
  target: string;
  pings: { seq: number; ttl: number; time: number }[];
  transmitted: number;
  received: number;
  loss: number;
  min: number | null;
  avg: number | null;
  max: number | null;
  testedAt: string;
}

export interface KnownDevice {
  mac: string;
  ip: string;
  hostname: string | null;
  vendor: string | null;
  customName?: string;
  firstSeen: string;
  lastSeen: string;
  trusted: boolean;
}
