import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import WifiManager from 'react-native-wifi-reborn';
import { colors } from '../config';
import { WifiNetwork } from '../types';
import { api } from '../services/api';
import { saveLocalHistory, toggleFavorite, getFavorites } from '../services/storage';
import { exportNetworksJSON, exportNetworksCSV } from '../services/export';

export default function ScanScreen() {
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<WifiNetwork | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [filter, setFilter] = useState<'all' | '5ghz' | 'open' | 'favorites'>('all');

  useEffect(() => {
    requestPermissions();
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    const favs = await getFavorites();
    setFavorites(favs);
  };

  const requestPermissions = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setHasPermission(true);
        scanNetworks();
      } else {
        Alert.alert('Permission refusee', 'La localisation est requise pour scanner les reseaux WiFi');
      }
    } catch (error) {
      console.error('Erreur permission:', error);
    }
  };

  const scanNetworks = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const wifiList = await WifiManager.loadWifiList();
      const scannedNetworks: WifiNetwork[] = wifiList.map((wifi: any) => ({
        ssid: wifi.SSID || '',
        bssid: wifi.BSSID || '',
        level: wifi.level || -100,
        frequency: wifi.frequency || 2400,
        capabilities: wifi.capabilities || '[UNKNOWN]',
        timestamp: Date.now(),
      })).sort((a: WifiNetwork, b: WifiNetwork) => b.level - a.level);

      setNetworks(scannedNetworks);
      setLastScan(new Date());

      // Sauvegarder dans l'historique
      const historyItem = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        networks: scannedNetworks,
        networkCount: scannedNetworks.length
      };
      await saveLocalHistory(historyItem);

      // Envoyer au serveur (si disponible)
      try {
        await api.saveScanHistory(scannedNetworks);
      } catch (e) {
        // Silently fail if server unavailable
      }
    } catch (error) {
      console.error('Erreur scan:', error);
      Alert.alert('Erreur', 'Impossible de scanner. Verifiez que le WiFi est active.');
    } finally {
      setScanning(false);
    }
  }, [scanning]);

  const handleConnect = async () => {
    if (!selectedNetwork) return;
    setConnecting(true);
    try {
      const isOpen = selectedNetwork.capabilities.includes('OPEN') || !selectedNetwork.capabilities.includes('WPA');
      if (isOpen) {
        await WifiManager.connectToProtectedSSID(selectedNetwork.ssid, '', false, false);
      } else {
        await WifiManager.connectToProtectedSSID(selectedNetwork.ssid, password, false, false);
      }
      Alert.alert('Succes', `Connecte a ${selectedNetwork.ssid}`);
      setShowConnectModal(false);
      setPassword('');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de se connecter');
    } finally {
      setConnecting(false);
    }
  };

  const handleToggleFavorite = async (bssid: string) => {
    const added = await toggleFavorite(bssid);
    await loadFavorites();
  };

  const handleExport = () => {
    Alert.alert('Exporter', 'Choisir le format', [
      { text: 'JSON', onPress: () => exportNetworksJSON(filteredNetworks) },
      { text: 'CSV', onPress: () => exportNetworksCSV(filteredNetworks) },
      { text: 'Annuler', style: 'cancel' }
    ]);
  };

  const getSignalColor = (level: number) => {
    if (level >= -50) return colors.success;
    if (level >= -60) return colors.warning;
    if (level >= -70) return colors.orange;
    return colors.danger;
  };

  const isSecure = (capabilities: string) => !capabilities.includes('OPEN');

  const filteredNetworks = networks.filter(n => {
    if (filter === '5ghz') return n.frequency >= 5000;
    if (filter === 'open') return !isSecure(n.capabilities);
    if (filter === 'favorites') return favorites.includes(n.bssid);
    return true;
  });

  const renderNetwork = ({ item }: { item: WifiNetwork }) => (
    <TouchableOpacity
      style={styles.networkCard}
      onPress={() => {
        setSelectedNetwork(item);
        setShowConnectModal(true);
      }}
    >
      <View style={styles.networkLeft}>
        <Ionicons name="wifi" size={28} color={getSignalColor(item.level)} />
        <View style={styles.networkInfo}>
          <View style={styles.ssidRow}>
            <Text style={styles.ssid}>{item.ssid || '(Reseau cache)'}</Text>
            {favorites.includes(item.bssid) && (
              <Ionicons name="star" size={14} color={colors.warning} style={{ marginLeft: 6 }} />
            )}
          </View>
          <Text style={styles.bssid}>{item.bssid}</Text>
        </View>
      </View>
      <View style={styles.networkRight}>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: colors.border }]}>
            <Text style={styles.badgeText}>{item.frequency >= 5000 ? '5GHz' : '2.4GHz'}</Text>
          </View>
          <Ionicons
            name={isSecure(item.capabilities) ? 'lock-closed' : 'lock-open'}
            size={16}
            color={isSecure(item.capabilities) ? colors.success : colors.danger}
          />
        </View>
        <Text style={styles.signal}>{item.level} dBm</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{networks.length}</Text>
          <Text style={styles.statLabel}>Reseaux</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{networks.filter(n => n.frequency >= 5000).length}</Text>
          <Text style={styles.statLabel}>5GHz</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{networks.filter(n => !isSecure(n.capabilities)).length}</Text>
          <Text style={styles.statLabel}>Ouverts</Text>
        </View>
      </View>

      {/* Filtres */}
      <View style={styles.filters}>
        {(['all', '5ghz', 'open', 'favorites'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Tous' : f === '5ghz' ? '5GHz' : f === 'open' ? 'Ouverts' : 'Favoris'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Ionicons name="share-outline" size={20} color={colors.primaryLight} />
        </TouchableOpacity>
      </View>

      {/* Liste */}
      <FlatList
        data={filteredNetworks}
        keyExtractor={(item) => item.bssid}
        renderItem={renderNetwork}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={scanning} onRefresh={scanNetworks} tintColor={colors.primaryLight} colors={[colors.primaryLight]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="wifi-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {hasPermission ? 'Tirez vers le bas pour scanner' : 'Permission localisation requise'}
            </Text>
          </View>
        }
      />

      {/* Bouton scan */}
      <TouchableOpacity
        style={[styles.scanButton, scanning && styles.scanButtonDisabled]}
        onPress={scanNetworks}
        disabled={scanning}
      >
        <Ionicons name={scanning ? 'sync' : 'refresh'} size={24} color="#fff" />
        <Text style={styles.scanButtonText}>{scanning ? 'Scan en cours...' : 'Scanner'}</Text>
      </TouchableOpacity>

      {lastScan && (
        <Text style={styles.lastScan}>Dernier scan: {lastScan.toLocaleTimeString()}</Text>
      )}

      {/* Modal connexion */}
      <Modal visible={showConnectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedNetwork?.ssid || 'Reseau cache'}</Text>
            <Text style={styles.modalSubtitle}>{selectedNetwork?.bssid}</Text>

            <View style={styles.modalInfo}>
              <Text style={styles.modalInfoText}>Signal: {selectedNetwork?.level} dBm</Text>
              <Text style={styles.modalInfoText}>
                Bande: {selectedNetwork?.frequency && selectedNetwork.frequency >= 5000 ? '5GHz' : '2.4GHz'}
              </Text>
              <Text style={styles.modalInfoText}>
                Securite: {selectedNetwork?.capabilities?.includes('WPA3') ? 'WPA3' :
                  selectedNetwork?.capabilities?.includes('WPA2') ? 'WPA2' :
                  selectedNetwork?.capabilities?.includes('WPA') ? 'WPA' :
                  selectedNetwork?.capabilities?.includes('WEP') ? 'WEP' : 'Ouvert'}
              </Text>
            </View>

            {selectedNetwork && isSecure(selectedNetwork.capabilities) && (
              <TextInput
                style={styles.passwordInput}
                placeholder="Mot de passe WiFi"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => selectedNetwork && handleToggleFavorite(selectedNetwork.bssid)}
              >
                <Ionicons
                  name={selectedNetwork && favorites.includes(selectedNetwork.bssid) ? 'star' : 'star-outline'}
                  size={20}
                  color={colors.warning}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => { setShowConnectModal(false); setPassword(''); }}
              >
                <Text style={styles.modalBtnText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtnPrimary, connecting && { opacity: 0.5 }]}
                onPress={handleConnect}
                disabled={connecting}
              >
                <Text style={styles.modalBtnTextPrimary}>
                  {connecting ? 'Connexion...' : 'Connecter'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  statsBar: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.card, marginHorizontal: 16, borderRadius: 12, marginBottom: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: colors.primaryLight },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  filters: {
    flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: colors.card,
  },
  filterBtnActive: { backgroundColor: colors.primary },
  filterText: { color: colors.textSecondary, fontSize: 13 },
  filterTextActive: { color: '#fff' },
  exportBtn: { marginLeft: 'auto', padding: 6 },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  networkCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 10,
  },
  networkLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  networkInfo: { marginLeft: 12, flex: 1 },
  ssidRow: { flexDirection: 'row', alignItems: 'center' },
  ssid: { fontSize: 16, fontWeight: '600', color: colors.text },
  bssid: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  networkRight: { alignItems: 'flex-end' },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.primaryLight },
  signal: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { color: colors.textSecondary, fontSize: 16, marginTop: 16 },
  scanButton: {
    position: 'absolute', bottom: 40, left: 20, right: 20,
    backgroundColor: colors.primary, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8,
  },
  scanButtonDisabled: { backgroundColor: '#1e40af', opacity: 0.7 },
  scanButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  lastScan: { position: 'absolute', bottom: 16, alignSelf: 'center', color: colors.textMuted, fontSize: 12 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 340,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  modalSubtitle: { fontSize: 12, color: colors.textSecondary, marginBottom: 16 },
  modalInfo: { marginBottom: 16 },
  modalInfoText: { color: colors.textSecondary, fontSize: 14, marginBottom: 4 },
  passwordInput: {
    backgroundColor: colors.background, borderRadius: 8, padding: 12,
    color: colors.text, marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtnSecondary: {
    padding: 12, borderRadius: 8, backgroundColor: colors.background,
  },
  modalBtnPrimary: {
    flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center',
  },
  modalBtnText: { color: colors.textSecondary },
  modalBtnTextPrimary: { color: '#fff', fontWeight: '600' },
});
