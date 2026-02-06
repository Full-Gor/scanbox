import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config';
import { NetworkDevice } from '../types';
import { api } from '../services/api';
import { exportDevicesJSON, exportDevicesCSV } from '../services/export';

// Identifier le type d'appareil d'apres le vendor/hostname/IP
function getDeviceLabel(device: NetworkDevice): string | null {
  const v = (device.vendor || '').toLowerCase();
  const h = (device.hostname || '').toLowerCase();
  const ip = device.ip;

  // Box internet (souvent .254 ou .1)
  if (ip.endsWith('.254') || ip.endsWith('.1')) {
    if (v.includes('sagemcom') || v.includes('technicolor') || v.includes('arcadyan') || v.includes('orange') || v.includes('sfr') || v.includes('bouygues') || v.includes('free'))
      return 'Box Internet';
    if (!v && (ip.endsWith('.254') || ip.endsWith('.1'))) return 'Box Internet / Routeur';
  }

  // Imprimantes
  if (v.includes('canon') || v.includes('epson') || v.includes('brother') || v.includes('hp') && (v.includes('print') || h.includes('print')))
    return 'Imprimante';
  if (h.includes('printer') || h.includes('print') || h.includes('imprimante'))
    return 'Imprimante';

  // Apple
  if (v.includes('apple')) {
    if (h.includes('iphone') || h.includes('ipad')) return h.includes('iphone') ? 'iPhone' : 'iPad';
    if (h.includes('macbook') || h.includes('mac')) return 'Mac';
    return 'Appareil Apple';
  }

  // Samsung
  if (v.includes('samsung')) {
    if (h.includes('galaxy') || h.includes('sm-')) return 'Samsung Galaxy';
    if (h.includes('tv')) return 'Samsung TV';
    return 'Samsung';
  }

  // Autres mobiles
  if (v.includes('xiaomi') || v.includes('redmi')) return 'Xiaomi';
  if (v.includes('huawei') || v.includes('honor')) return 'Huawei';
  if (v.includes('oneplus')) return 'OnePlus';
  if (v.includes('oppo')) return 'OPPO';
  if (v.includes('google')) return 'Google / Pixel';

  // PC / serveurs
  if (v.includes('intel') || v.includes('realtek')) return 'PC';
  if (v.includes('dell')) return 'PC Dell';
  if (v.includes('lenovo')) return 'PC Lenovo';
  if (v.includes('asus') && !v.includes('router')) return 'PC Asus';
  if (v.includes('raspberry')) return 'Raspberry Pi';

  // Routeurs/AP
  if (v.includes('tp-link') || v.includes('netgear') || v.includes('asus') || v.includes('ubiquiti') || v.includes('mikrotik'))
    return 'Routeur / AP WiFi';

  // Smart TV / IoT
  if (v.includes('lg') && (h.includes('tv') || h.includes('lg'))) return 'LG TV';
  if (v.includes('amazon') || v.includes('echo')) return 'Amazon Echo / Alexa';

  if (device.isServer) return 'Serveur';
  return null;
}

function getDeviceIcon(device: NetworkDevice): string {
  const label = (getDeviceLabel(device) || '').toLowerCase();
  const v = (device.vendor || '').toLowerCase();

  if (device.isServer) return 'server';
  if (label.includes('box') || label.includes('routeur') || label.includes('ap wifi')) return 'wifi';
  if (label.includes('imprimante')) return 'print';
  if (label.includes('iphone') || label.includes('galaxy') || label.includes('xiaomi') || label.includes('huawei') || label.includes('oneplus') || label.includes('oppo') || label.includes('pixel')) return 'phone-portrait';
  if (label.includes('ipad')) return 'tablet-portrait';
  if (label.includes('mac') || label.includes('pc') || label.includes('dell') || label.includes('lenovo') || label.includes('asus')) return 'desktop';
  if (label.includes('raspberry')) return 'hardware-chip';
  if (label.includes('tv')) return 'tv';
  if (label.includes('echo') || label.includes('alexa')) return 'mic';
  if (label.includes('apple')) return 'logo-apple';

  // Fallback par vendor
  if (v.includes('apple')) return 'logo-apple';
  if (v.includes('samsung') || v.includes('xiaomi') || v.includes('huawei')) return 'phone-portrait';
  if (v.includes('intel') || v.includes('dell') || v.includes('hp') || v.includes('lenovo')) return 'desktop';
  return 'hardware-chip-outline';
}

function getDeviceColor(device: NetworkDevice): string {
  if (device.isServer) return colors.success;
  const label = (getDeviceLabel(device) || '').toLowerCase();
  if (label.includes('box') || label.includes('routeur')) return colors.warning;
  if (label.includes('imprimante')) return colors.orange;
  if (label.includes('iphone') || label.includes('ipad') || label.includes('apple') || label.includes('mac')) return '#a78bfa';
  return colors.primaryLight;
}

export default function DevicesScreen() {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [serverIP, setServerIP] = useState<string>('');
  const [subnet, setSubnet] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scanDevices = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    setError(null);
    try {
      const result = await api.scanDevices();
      setDevices(result.devices);
      setServerIP(result.serverIP);
      setSubnet(result.subnet);
      setLastScan(new Date());
    } catch (err: any) {
      setError(err.message || 'Impossible de scanner le reseau');
      Alert.alert('Erreur', err.message);
    } finally {
      setScanning(false);
    }
  }, [scanning]);

  const handleExport = () => {
    if (devices.length === 0) {
      Alert.alert('Erreur', 'Aucun appareil a exporter');
      return;
    }
    Alert.alert('Exporter', 'Choisir le format', [
      { text: 'JSON', onPress: () => exportDevicesJSON(devices) },
      { text: 'CSV', onPress: () => exportDevicesCSV(devices) },
      { text: 'Annuler', style: 'cancel' }
    ]);
  };

  const onlineCount = devices.length;

  const renderDevice = ({ item }: { item: NetworkDevice }) => {
    const label = getDeviceLabel(item);
    const iconColor = getDeviceColor(item);

    return (
      <TouchableOpacity style={styles.deviceCard}>
        <View style={[styles.deviceIcon, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={getDeviceIcon(item) as any} size={24} color={iconColor} />
        </View>
        <View style={styles.deviceInfo}>
          <View style={styles.deviceHeader}>
            <Text style={styles.deviceIP}>{item.ip}</Text>
            {item.isServer && (
              <View style={styles.serverBadge}>
                <Text style={styles.serverBadgeText}>Serveur</Text>
              </View>
            )}
          </View>
          {label && (
            <Text style={[styles.deviceLabel, { color: iconColor }]}>{label}</Text>
          )}
          {item.hostname && (
            <Text style={styles.deviceHostname}>{item.hostname}</Text>
          )}
          <Text style={styles.deviceMac}>{item.mac || 'MAC inconnu'}</Text>
          {item.vendor && (
            <Text style={styles.deviceVendor}>{item.vendor}</Text>
          )}
        </View>
        <View style={styles.onlineDot} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header info */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerLabel}>Reseau</Text>
          <Text style={styles.headerValue}>{subnet || 'Non scanne'}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerLabel}>En ligne</Text>
          <Text style={styles.headerValue}>{onlineCount}</Text>
        </View>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Ionicons name="share-outline" size={22} color={colors.primaryLight} />
        </TouchableOpacity>
      </View>

      {/* Liste des appareils */}
      <FlatList
        data={devices}
        keyExtractor={(item) => item.ip}
        renderItem={renderDevice}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={scanning}
            onRefresh={scanDevices}
            tintColor={colors.primaryLight}
            colors={[colors.primaryLight]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {scanning ? (
              <>
                <ActivityIndicator size="large" color={colors.primaryLight} />
                <Text style={styles.emptyText}>Scan du reseau en cours...</Text>
                <Text style={styles.emptySubtext}>Cela peut prendre quelques secondes</Text>
              </>
            ) : error ? (
              <>
                <Ionicons name="alert-circle-outline" size={64} color={colors.danger} />
                <Text style={styles.emptyText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={scanDevices}>
                  <Text style={styles.retryBtnText}>Reessayer</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Ionicons name="hardware-chip-outline" size={64} color={colors.textMuted} />
                <Text style={styles.emptyText}>Aucun appareil detecte</Text>
                <Text style={styles.emptySubtext}>Tirez vers le bas pour scanner les appareils connectes</Text>
              </>
            )}
          </View>
        }
      />

      {/* Bouton scan */}
      <TouchableOpacity
        style={[styles.scanButton, scanning && styles.scanButtonDisabled]}
        onPress={scanDevices}
        disabled={scanning}
      >
        <Ionicons name={scanning ? 'sync' : 'search'} size={24} color="#fff" />
        <Text style={styles.scanButtonText}>
          {scanning ? 'Scan en cours...' : 'Scanner le reseau'}
        </Text>
      </TouchableOpacity>

      {lastScan && (
        <Text style={styles.lastScan}>Dernier scan: {lastScan.toLocaleTimeString()}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, padding: 16,
  },
  headerInfo: { flex: 1 },
  headerLabel: { fontSize: 12, color: colors.textSecondary },
  headerValue: { fontSize: 18, fontWeight: 'bold', color: colors.primaryLight, marginTop: 2 },
  exportBtn: { padding: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  deviceCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, padding: 14, borderRadius: 12, marginBottom: 8,
  },
  deviceIcon: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  deviceInfo: { flex: 1, marginLeft: 12 },
  deviceHeader: { flexDirection: 'row', alignItems: 'center' },
  deviceIP: { fontSize: 16, fontWeight: '600', color: colors.text },
  serverBadge: {
    marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2,
    backgroundColor: colors.success + '30', borderRadius: 4,
  },
  serverBadgeText: { fontSize: 10, color: colors.success, fontWeight: '600' },
  deviceLabel: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  deviceHostname: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  deviceMac: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  deviceVendor: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { color: colors.textSecondary, fontSize: 16, marginTop: 16, textAlign: 'center' },
  emptySubtext: { color: colors.textMuted, fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
  retryBtn: {
    marginTop: 20, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: colors.primary, borderRadius: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  scanButton: {
    position: 'absolute', bottom: 40, left: 20, right: 20,
    backgroundColor: colors.primary, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8,
  },
  scanButtonDisabled: { backgroundColor: '#1e40af', opacity: 0.7 },
  scanButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  lastScan: { position: 'absolute', bottom: 16, alignSelf: 'center', color: colors.textMuted, fontSize: 12 },
});
