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

  const getDeviceIcon = (device: NetworkDevice): string => {
    if (device.isServer) return 'server';
    const vendor = (device.vendor || '').toLowerCase();
    if (vendor.includes('apple') || vendor.includes('iphone')) return 'phone-portrait';
    if (vendor.includes('samsung') || vendor.includes('xiaomi') || vendor.includes('huawei')) return 'phone-portrait';
    if (vendor.includes('raspberry') || vendor.includes('pi')) return 'hardware-chip';
    if (vendor.includes('amazon') || vendor.includes('echo')) return 'mic';
    if (vendor.includes('google') || vendor.includes('nest')) return 'home';
    if (vendor.includes('intel') || vendor.includes('dell') || vendor.includes('hp') || vendor.includes('lenovo')) return 'desktop';
    if (vendor.includes('tp-link') || vendor.includes('netgear') || vendor.includes('asus')) return 'wifi';
    return 'hardware-chip-outline';
  };

  const renderDevice = ({ item }: { item: NetworkDevice }) => (
    <TouchableOpacity style={styles.deviceCard}>
      <View style={styles.deviceIcon}>
        <Ionicons
          name={getDeviceIcon(item) as any}
          size={24}
          color={item.isServer ? colors.success : colors.primaryLight}
        />
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
        {item.hostname && (
          <Text style={styles.deviceHostname}>{item.hostname}</Text>
        )}
        <Text style={styles.deviceMac}>{item.mac || 'MAC inconnu'}</Text>
        {item.vendor && (
          <Text style={styles.deviceVendor}>{item.vendor}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header info */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerLabel}>Reseau</Text>
          <Text style={styles.headerValue}>{subnet || 'Non scanne'}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerLabel}>Appareils</Text>
          <Text style={styles.headerValue}>{devices.length}</Text>
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
                <Text style={styles.emptySubtext}>Appuyez sur Scanner pour detecter les appareils connectes a votre box</Text>
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
    backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 10,
  },
  deviceIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
  },
  deviceInfo: { flex: 1, marginLeft: 12 },
  deviceHeader: { flexDirection: 'row', alignItems: 'center' },
  deviceIP: { fontSize: 16, fontWeight: '600', color: colors.text },
  serverBadge: {
    marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2,
    backgroundColor: colors.success + '30', borderRadius: 4,
  },
  serverBadgeText: { fontSize: 10, color: colors.success, fontWeight: '600' },
  deviceHostname: { fontSize: 14, color: colors.primaryLight, marginTop: 2 },
  deviceMac: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  deviceVendor: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
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
