import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import WifiManager from 'react-native-wifi-reborn';

export default function App() {
  const [wifiList, setWifiList] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        
        const allGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );
        
        setPermissionGranted(allGranted);
        if (allGranted) {
          scanWifi();
        } else {
          setError('Permissions de localisation requises pour scanner le WiFi');
        }
      } catch (err) {
        setError('Erreur lors de la demande de permissions');
      }
    }
  };

  const scanWifi = async () => {
    if (scanning) return;
    
    setScanning(true);
    setError(null);
    
    try {
      const networks = await WifiManager.loadWifiList();
      const sortedNetworks = networks.sort((a, b) => b.level - a.level);
      setWifiList(sortedNetworks);
    } catch (err) {
      setError('Erreur lors du scan: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  const getSignalStrength = (level) => {
    if (level >= -50) return { text: 'Excellent', color: '#00ff88', bars: 4 };
    if (level >= -60) return { text: 'Bon', color: '#88ff00', bars: 3 };
    if (level >= -70) return { text: 'Moyen', color: '#ffcc00', bars: 2 };
    return { text: 'Faible', color: '#ff4444', bars: 1 };
  };

  const getSecurityIcon = (capabilities) => {
    if (!capabilities) return '🔓';
    if (capabilities.includes('WPA3')) return '🔒';
    if (capabilities.includes('WPA2')) return '🔐';
    if (capabilities.includes('WPA')) return '🔑';
    if (capabilities.includes('WEP')) return '⚠️';
    return '🔓';
  };

  const renderWifiItem = ({ item, index }) => {
    const signal = getSignalStrength(item.level);
    const securityIcon = getSecurityIcon(item.capabilities);
    
    return (
      <View style={[styles.wifiItem, { borderLeftColor: signal.color }]}>
        <View style={styles.wifiHeader}>
          <Text style={styles.wifiName}>{item.SSID || 'Réseau masqué'}</Text>
          <Text style={styles.securityIcon}>{securityIcon}</Text>
        </View>
        
        <View style={styles.wifiDetails}>
          <View style={styles.signalContainer}>
            <View style={styles.signalBars}>
              {[1, 2, 3, 4].map((bar) => (
                <View
                  key={bar}
                  style={[
                    styles.signalBar,
                    { 
                      height: bar * 4 + 4,
                      backgroundColor: bar <= signal.bars ? signal.color : '#333'
                    }
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.signalText, { color: signal.color }]}>
              {item.level} dBm
            </Text>
          </View>
          
          <Text style={styles.wifiInfo}>
            CH: {item.frequency ? Math.round((item.frequency - 2407) / 5) : '?'}
          </Text>
          
          <Text style={styles.wifiInfo}>
            {item.frequency ? (item.frequency < 3000 ? '2.4GHz' : '5GHz') : ''}
          </Text>
        </View>
        
        <Text style={styles.bssid}>{item.BSSID}</Text>
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.title}>📡 ScanBox</Text>
        <Text style={styles.subtitle}>Scanner WiFi</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.scanButton, scanning && styles.scanButtonDisabled]}
        onPress={scanWifi}
        disabled={scanning || !permissionGranted}
      >
        {scanning ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.scanButtonText}>🔍 Scanner</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.countText}>
        {wifiList.length} réseau{wifiList.length > 1 ? 'x' : ''} trouvé{wifiList.length > 1 ? 's' : ''}
      </Text>

      <FlatList
        data={wifiList}
        renderItem={renderWifiItem}
        keyExtractor={(item, index) => item.BSSID + index}
        style={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={scanning}
            onRefresh={scanWifi}
            tintColor="#00ff88"
          />
        }
        ListEmptyComponent={
          !scanning && (
            <Text style={styles.emptyText}>
              Appuyez sur Scanner pour détecter les réseaux WiFi
            </Text>
          )
        }
      />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00ff88',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: '#ff444433',
    padding: 10,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorText: {
    color: '#ff4444',
    textAlign: 'center',
  },
  scanButton: {
    backgroundColor: '#00ff88',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginHorizontal: 50,
    alignItems: 'center',
    marginBottom: 15,
  },
  scanButtonDisabled: {
    backgroundColor: '#006644',
  },
  scanButtonText: {
    color: '#0f0f1a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  countText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  list: {
    flex: 1,
    paddingHorizontal: 15,
  },
  wifiItem: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  wifiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wifiName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  securityIcon: {
    fontSize: 18,
  },
  wifiDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  signalContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  signalBar: {
    width: 4,
    borderRadius: 2,
  },
  signalText: {
    fontSize: 12,
    fontWeight: '500',
  },
  wifiInfo: {
    color: '#888',
    fontSize: 12,
  },
  bssid: {
    color: '#444',
    fontSize: 10,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 14,
  },
});
