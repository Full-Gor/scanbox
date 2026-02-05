import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { WifiNetwork, NetworkDevice } from '../types';

// Export WiFi networks en JSON
export async function exportNetworksJSON(networks: WifiNetwork[]): Promise<void> {
  const data = {
    exportedAt: new Date().toISOString(),
    count: networks.length,
    networks: networks.map(n => ({
      ssid: n.ssid,
      bssid: n.bssid,
      signal: n.level,
      frequency: n.frequency,
      band: n.frequency >= 5000 ? '5GHz' : '2.4GHz',
      security: n.capabilities,
      timestamp: n.timestamp
    }))
  };

  const filename = `scanbox_wifi_${Date.now()}.json`;
  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(data, null, 2));
  await Sharing.shareAsync(path);
}

// Export WiFi networks en CSV
export async function exportNetworksCSV(networks: WifiNetwork[]): Promise<void> {
  const header = 'SSID,BSSID,Signal (dBm),Frequency (MHz),Band,Security\n';
  const rows = networks.map(n =>
    `"${n.ssid}","${n.bssid}",${n.level},${n.frequency},${n.frequency >= 5000 ? '5GHz' : '2.4GHz'},"${n.capabilities}"`
  ).join('\n');

  const filename = `scanbox_wifi_${Date.now()}.csv`;
  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, header + rows);
  await Sharing.shareAsync(path);
}

// Export devices en JSON
export async function exportDevicesJSON(devices: NetworkDevice[]): Promise<void> {
  const data = {
    exportedAt: new Date().toISOString(),
    count: devices.length,
    devices
  };

  const filename = `scanbox_devices_${Date.now()}.json`;
  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(data, null, 2));
  await Sharing.shareAsync(path);
}

// Export devices en CSV
export async function exportDevicesCSV(devices: NetworkDevice[]): Promise<void> {
  const header = 'IP,Hostname,MAC,Vendor,IsServer\n';
  const rows = devices.map(d =>
    `"${d.ip}","${d.hostname || ''}","${d.mac || ''}","${d.vendor || ''}",${d.isServer}`
  ).join('\n');

  const filename = `scanbox_devices_${Date.now()}.csv`;
  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, header + rows);
  await Sharing.shareAsync(path);
}
