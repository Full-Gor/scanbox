import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  RefreshControl, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config';
import { ScanHistoryItem, WifiNetwork } from '../types';
import { getLocalHistory } from '../services/storage';
import { api } from '../services/api';

export default function HistoryScreen() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'local' | 'server'>('local');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [source]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      if (source === 'local') {
        const localHistory = await getLocalHistory();
        setHistory(localHistory);
      } else {
        const serverHistory = await api.getScanHistory(50);
        setHistory(serverHistory);
      }
    } catch (error: any) {
      if (source === 'server') {
        Alert.alert('Erreur', 'Impossible de charger l\'historique serveur');
        setSource('local');
      }
    } finally {
      setLoading(false);
    }
  }, [source]);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'A l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getSignalColor = (level: number) => {
    if (level >= -50) return colors.success;
    if (level >= -60) return colors.warning;
    if (level >= -70) return colors.orange;
    return colors.danger;
  };

  const renderNetworkMini = (network: WifiNetwork) => (
    <View key={network.bssid} style={styles.networkMini}>
      <Ionicons name="wifi" size={14} color={getSignalColor(network.level)} />
      <Text style={styles.networkMiniText} numberOfLines={1}>
        {network.ssid || '(Cache)'}
      </Text>
      <Text style={styles.networkMiniLevel}>{network.level}</Text>
    </View>
  );

  const renderHistoryItem = ({ item }: { item: ScanHistoryItem }) => {
    const isExpanded = expandedId === item.id;
    const topNetworks = item.networks.slice(0, 5);
    const count5GHz = item.networks.filter(n => n.frequency >= 5000).length;

    return (
      <TouchableOpacity
        style={styles.historyCard}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
      >
        <View style={styles.historyHeader}>
          <View style={styles.historyLeft}>
            <View style={styles.historyIcon}>
              <Ionicons name="time-outline" size={20} color={colors.primaryLight} />
            </View>
            <View>
              <Text style={styles.historyDate}>{formatDate(item.timestamp)}</Text>
              <Text style={styles.historyTime}>
                {new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
          <View style={styles.historyRight}>
            <View style={styles.historyStats}>
              <Text style={styles.historyCount}>{item.networkCount}</Text>
              <Text style={styles.historyCountLabel}>reseaux</Text>
            </View>
            <View style={styles.historyStats}>
              <Text style={styles.historyCount}>{count5GHz}</Text>
              <Text style={styles.historyCountLabel}>5GHz</Text>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </View>
        </View>

        {isExpanded && (
          <View style={styles.networksList}>
            <Text style={styles.networksListTitle}>Top reseaux detectes</Text>
            {topNetworks.map(renderNetworkMini)}
            {item.networks.length > 5 && (
              <Text style={styles.moreNetworks}>
                +{item.networks.length - 5} autres reseaux
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Toggle source */}
      <View style={styles.sourceToggle}>
        <TouchableOpacity
          style={[styles.sourceBtn, source === 'local' && styles.sourceBtnActive]}
          onPress={() => setSource('local')}
        >
          <Ionicons name="phone-portrait-outline" size={18} color={source === 'local' ? '#fff' : colors.textSecondary} />
          <Text style={[styles.sourceBtnText, source === 'local' && styles.sourceBtnTextActive]}>
            Local
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sourceBtn, source === 'server' && styles.sourceBtnActive]}
          onPress={() => setSource('server')}
        >
          <Ionicons name="cloud-outline" size={18} color={source === 'server' ? '#fff' : colors.textSecondary} />
          <Text style={[styles.sourceBtnText, source === 'server' && styles.sourceBtnTextActive]}>
            Serveur
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste historique */}
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadHistory}
            tintColor={colors.primaryLight}
            colors={[colors.primaryLight]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>Aucun historique</Text>
            <Text style={styles.emptySubtext}>
              Les scans WiFi seront enregistres ici
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sourceToggle: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.card, borderRadius: 12, padding: 4,
  },
  sourceBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 6,
  },
  sourceBtnActive: { backgroundColor: colors.primary },
  sourceBtnText: { color: colors.textSecondary, fontWeight: '500' },
  sourceBtnTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  historyCard: {
    backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 10,
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyLeft: { flexDirection: 'row', alignItems: 'center' },
  historyIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  historyDate: { fontSize: 15, fontWeight: '600', color: colors.text },
  historyTime: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  historyStats: { alignItems: 'center' },
  historyCount: { fontSize: 18, fontWeight: 'bold', color: colors.primaryLight },
  historyCountLabel: { fontSize: 10, color: colors.textSecondary },
  networksList: {
    marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.background,
  },
  networksListTitle: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  networkMini: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8,
  },
  networkMiniText: { flex: 1, color: colors.text, fontSize: 14 },
  networkMiniLevel: { color: colors.textSecondary, fontSize: 12 },
  moreNetworks: {
    marginTop: 8, color: colors.textMuted, fontSize: 12, fontStyle: 'italic',
  },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { color: colors.textSecondary, fontSize: 16, marginTop: 16 },
  emptySubtext: { color: colors.textMuted, fontSize: 14, marginTop: 8 },
});
