import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import WifiManager from 'react-native-wifi-reborn';

interface WifiNetwork {
  ssid: string;
  bssid: string;
  level: number;
  frequency: number;
  capabilities: string;
  timestamp: number;
}

export default function App() {
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);

  useEffect(() => {
    requestPermissions();
  }, []);

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
      // Vrai scan WiFi via react-native-wifi-reborn
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
    } catch (error) {
      console.error('Erreur scan:', error);
      Alert.alert('Erreur', 'Impossible de scanner les reseaux. Verifiez que le WiFi est active.');
    } finally {
      setScanning(false);
    }
  }, [scanning]);

  const getSignalIcon = (level: number) => {
    if (level >= -50) return 'wifi';
    if (level >= -60) return 'wifi';
    if (level >= -70) return 'wifi-outline';
    return 'wifi-outline';
  };

  const getSignalColor = (level: number) => {
    if (level >= -50) return '#4ade80';
    if (level >= -60) return '#facc15';
    if (level >= -70) return '#fb923c';
    return '#ef4444';
  };

  const getFrequencyBand = (freq: number) => {
    return freq >= 5000 ? '5GHz' : '2.4GHz';
  };

  const isSecure = (capabilities: string) => {
    return !capabilities.includes('OPEN');
  };

  const renderNetwork = ({ item }: { item: WifiNetwork }) => (
    <TouchableOpacity style={styles.networkCard}>
      <View style={styles.networkLeft}>
        <Ionicons 
          name={getSignalIcon(item.level)} 
          size={28} 
          color={getSignalColor(item.level)} 
        />
        <View style={styles.networkInfo}>
          <Text style={styles.ssid}>{item.ssid || '(Reseau cache)'}</Text>
          <Text style={styles.bssid}>{item.bssid}</Text>
        </View>
      </View>
      <View style={styles.networkRight}>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: '#1e3a5f' }]}>
            <Text style={styles.badgeText}>{getFrequencyBand(item.frequency)}</Text>
          </View>
          {isSecure(item.capabilities) ? (
            <Ionicons name="lock-closed" size={16} color="#4ade80" />
          ) : (
            <Ionicons name="lock-open" size={16} color="#ef4444" />
          )}
        </View>
        <Text style={styles.signal}>{item.level} dBm</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.title}>ScanBox</Text>
        <Text style={styles.subtitle}>WiFi Scanner</Text>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{networks.length}</Text>
          <Text style={styles.statLabel}>Reseaux</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {networks.filter(n => n.frequency >= 5000).length}
          </Text>
          <Text style={styles.statLabel}>5GHz</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {networks.filter(n => !isSecure(n.capabilities)).length}
          </Text>
          <Text style={styles.statLabel}>Ouverts</Text>
        </View>
      </View>

      <FlatList
        data={networks}
        keyExtractor={(item) => item.bssid}
        renderItem={renderNetwork}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={scanning}
            onRefresh={scanNetworks}
            tintColor="#60a5fa"
            colors={['#60a5fa']}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="wifi-outline" size={64} color="#4b5563" />
            <Text style={styles.emptyText}>
              {hasPermission 
                ? 'Tirez vers le bas pour scanner'
                : 'Permission localisation requise'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={[styles.scanButton, scanning && styles.scanButtonDisabled]}
        onPress={scanNetworks}
        disabled={scanning}
      >
        <Ionicons 
          name={scanning ? 'sync' : 'refresh'} 
          size={24} 
          color="#fff" 
        />
        <Text style={styles.scanButtonText}>
          {scanning ? 'Scan en cours...' : 'Scanner'}
        </Text>
      </TouchableOpacity>

      {lastScan && (
        <Text style={styles.lastScan}>
          Dernier scan: {lastScan.toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#111118',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#60a5fa',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  networkCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111118',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  networkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  networkInfo: {
    marginLeft: 12,
    flex: 1,
  },
  ssid: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bssid: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  networkRight: {
    alignItems: 'flex-end',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#60a5fa',
  },
  signal: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
    marginTop: 16,
  },
  scanButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonDisabled: {
    backgroundColor: '#1e40af',
    opacity: 0.7,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  lastScan: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    color: '#4b5563',
    fontSize: 12,
  },
});
