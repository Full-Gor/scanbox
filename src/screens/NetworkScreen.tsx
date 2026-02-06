import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config';
import { OpenPort, ConnectionGroup, ServiceStatus } from '../types';
import { api } from '../services/api';

type Section = 'services' | 'ports' | 'connections';

// Labels intelligents pour les IPs connues
function getConnectionLabel(ip: string, processes: string[]): string | null {
  // IPs locales
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    if (processes.some(p => p.includes('node'))) return 'Services locaux (Node.js)';
    return 'Localhost';
  }
  // Reseau local
  if (ip.startsWith('192.168.')) return `Reseau local (${ip})`;
  // Google
  if (ip.startsWith('2a00:1450:') || ip.startsWith('142.250.') || ip.startsWith('172.217.')) return 'Google';
  // VPS Contabo
  if (ip === '207.180.204.232') return 'VPS Contabo (NexusTunnel)';
  // Cloudflare
  if (ip.startsWith('104.') || ip.startsWith('1.1.1.')) return 'Cloudflare';
  // Navigation web generique (IPv6)
  if (ip.startsWith('2607:') || ip.startsWith('2a00:') || ip.startsWith('2a03:')) return 'Navigation Web';
  return null;
}

function getConnectionIcon(ip: string, processes: string[]): string {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return 'server';
  if (ip === '207.180.204.232') return 'cloud-upload';
  if (processes.some(p => p.toLowerCase().includes('chrome') || p.toLowerCase().includes('firefox'))) return 'globe';
  if (processes.some(p => p.toLowerCase().includes('code'))) return 'code-slash';
  if (processes.some(p => p.toLowerCase().includes('node'))) return 'logo-nodejs';
  return 'git-network';
}

// Labels pour les ports connus
function getPortLabel(port: number): string | null {
  const known: Record<number, string> = {
    22: 'SSH', 53: 'DNS', 80: 'HTTP', 443: 'HTTPS',
    631: 'Imprimante', 3000: 'Cloud1', 3001: 'NexusBuild',
    5678: 'N8N', 5679: 'N8N Worker', 8080: 'Proxy HTTP',
    9090: 'Cockpit', 18955: 'VS Code', 51984: 'VS Code',
  };
  return known[port] || null;
}

export default function NetworkScreen() {
  const [section, setSection] = useState<Section>('services');
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [ports, setPorts] = useState<OpenPort[]>([]);
  const [portCount, setPortCount] = useState(0);
  const [connections, setConnections] = useState<ConnectionGroup[]>([]);
  const [totalConns, setTotalConns] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const [svcData, portData, connData] = await Promise.all([
        api.getServices(),
        api.getPorts(),
        api.getConnections(),
      ]);
      setServices(svcData.services);
      setPorts(portData.ports);
      setPortCount(portData.count);
      setConnections(connData.groups);
      setTotalConns(connData.total);
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Auto-load au montage
  useEffect(() => { loadData(); }, []);

  const getServiceIcon = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('cloud')) return 'cloud';
    if (n.includes('nexusbuild')) return 'construct';
    if (n.includes('nginx')) return 'globe';
    if (n.includes('ssh')) return 'terminal';
    if (n.includes('docker')) return 'cube';
    return 'server';
  };

  const getPortIcon = (port: OpenPort): string => {
    if (port.name?.includes('DNS')) return 'globe';
    if (port.name?.includes('Imprimante')) return 'print';
    if (port.name?.includes('HTTP')) return 'globe';
    if (port.name?.includes('Cloud1')) return 'cloud';
    if (port.name?.includes('NexusBuild')) return 'construct';
    if (port.name?.includes('VS Code')) return 'code-slash';
    return 'radio-button-on';
  };

  const renderServices = () => (
    <View style={styles.sectionContent}>
      {services.map((svc) => (
        <View key={svc.name} style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: svc.active ? colors.success + '20' : colors.danger + '20' }]}>
            <Ionicons
              name={getServiceIcon(svc.name) as any}
              size={22}
              color={svc.active ? colors.success : colors.danger}
            />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{svc.name}</Text>
            <Text style={[styles.cardStatus, { color: svc.active ? colors.success : colors.danger }]}>
              {svc.active ? 'Actif' : 'Inactif'}
            </Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: svc.active ? colors.success : colors.danger }]} />
        </View>
      ))}
    </View>
  );

  const renderPorts = () => (
    <View style={styles.sectionContent}>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{portCount}</Text>
          <Text style={styles.statLabel}>Ports ouverts</Text>
        </View>
      </View>
      {ports.map((port) => (
        <View key={port.port} style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name={getPortIcon(port) as any} size={20} color={colors.primaryLight} />
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.cardRow}>
              <Text style={styles.portNumber}>{port.port}</Text>
              {port.name && (
                <View style={styles.portBadge}>
                  <Text style={styles.portBadgeText}>{port.name}</Text>
                </View>
              )}
            </View>
            {port.process && (
              <Text style={styles.cardSub}>{port.process}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  const renderConnections = () => (
    <View style={styles.sectionContent}>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalConns}</Text>
          <Text style={styles.statLabel}>Connexions actives</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{connections.length}</Text>
          <Text style={styles.statLabel}>Destinations</Text>
        </View>
      </View>
      {connections.map((group) => {
        const label = getConnectionLabel(group.ip, group.processes);
        const icon = getConnectionIcon(group.ip, group.processes);
        const portsWithNames = group.ports.slice(0, 5).map(p => {
          const name = getPortLabel(p);
          return name ? `${p} (${name})` : `${p}`;
        });
        return (
          <View key={group.ip} style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: colors.orange + '20' }]}>
              <Ionicons name={icon as any} size={20} color={colors.orange} />
            </View>
            <View style={styles.cardInfo}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {label || group.ip}
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{group.count}</Text>
                </View>
              </View>
              {label && (
                <Text style={styles.connIP}>{group.ip}</Text>
              )}
              {group.processes.length > 0 && (
                <Text style={styles.cardSub}>{group.processes.join(', ')}</Text>
              )}
              {group.ports.length > 0 && (
                <Text style={styles.portsList}>
                  Ports: {portsWithNames.join(', ')}{group.ports.length > 5 ? ` +${group.ports.length - 5}` : ''}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Onglets sous-section */}
      <View style={styles.tabs}>
        {([
          { id: 'services', label: 'Services', icon: 'server' },
          { id: 'ports', label: 'Ports', icon: 'radio-button-on' },
          { id: 'connections', label: 'Connexions', icon: 'git-network' },
        ] as { id: Section; label: string; icon: string }[]).map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, section === tab.id && styles.tabActive]}
            onPress={() => setSection(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={section === tab.id ? colors.primaryLight : colors.textMuted}
            />
            <Text style={[styles.tabText, section === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadData}
            tintColor={colors.primaryLight}
            colors={[colors.primaryLight]}
          />
        }
      >
        {loading && services.length === 0 ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={styles.emptyText}>Chargement...</Text>
          </View>
        ) : error ? (
          <View style={styles.empty}>
            <Ionicons name="alert-circle-outline" size={64} color={colors.danger} />
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
              <Text style={styles.retryBtnText}>Reessayer</Text>
            </TouchableOpacity>
          </View>
        ) : services.length === 0 && ports.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="globe-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>Aucune donnee</Text>
            <Text style={styles.emptySub}>Tirez vers le bas pour charger</Text>
          </View>
        ) : (
          <>
            {section === 'services' && renderServices()}
            {section === 'ports' && renderPorts()}
            {section === 'connections' && renderConnections()}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.loadBtn, loading && styles.loadBtnDisabled]}
        onPress={loadData}
        disabled={loading}
      >
        <Ionicons name={loading ? 'sync' : 'refresh'} size={24} color="#fff" />
        <Text style={styles.loadBtnText}>
          {loading ? 'Chargement...' : 'Actualiser'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.card, borderRadius: 10, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 8, gap: 6,
  },
  tabActive: { backgroundColor: colors.primary + '30' },
  tabText: { fontSize: 13, color: colors.textMuted },
  tabTextActive: { color: colors.primaryLight, fontWeight: '600' },
  scrollView: { flex: 1 },
  sectionContent: { paddingHorizontal: 16, paddingBottom: 120 },
  statsRow: {
    flexDirection: 'row', gap: 12, marginBottom: 12,
  },
  statBox: {
    flex: 1, backgroundColor: colors.card, borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: colors.primaryLight },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, padding: 14, borderRadius: 12, marginBottom: 8,
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text, flexShrink: 1 },
  cardStatus: { fontSize: 13, marginTop: 2 },
  cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  portNumber: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  portBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
    backgroundColor: colors.primary + '30',
  },
  portBadgeText: { fontSize: 11, color: colors.primaryLight, fontWeight: '600' },
  portsList: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  connIP: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  countBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
    backgroundColor: colors.orange + '30',
  },
  countBadgeText: { fontSize: 12, color: colors.orange, fontWeight: 'bold' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { color: colors.textSecondary, fontSize: 16, marginTop: 16, textAlign: 'center' },
  emptySub: { color: colors.textMuted, fontSize: 14, marginTop: 8 },
  retryBtn: {
    marginTop: 20, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: colors.primary, borderRadius: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  loadBtn: {
    position: 'absolute', bottom: 40, left: 20, right: 20,
    backgroundColor: colors.primary, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8,
  },
  loadBtnDisabled: { backgroundColor: '#1e40af', opacity: 0.7 },
  loadBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
