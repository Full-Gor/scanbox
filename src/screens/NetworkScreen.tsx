import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, ScrollView, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config';
import { OpenPort, ConnectionGroup, ServiceStatus, SpeedTestResult, PingResult } from '../types';
import { api } from '../services/api';

type Section = 'speedtest' | 'ping' | 'ports' | 'connections';

// Labels intelligents pour les IPs connues
function getConnectionLabel(ip: string, processes: string[]): string | null {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    if (processes.some(p => p.includes('node'))) return 'Services locaux (Node.js)';
    return 'Localhost';
  }
  if (ip.startsWith('192.168.')) return `Reseau local (${ip})`;
  if (ip.startsWith('2a00:1450:') || ip.startsWith('142.250.') || ip.startsWith('172.217.')) return 'Google';
  if (ip === '207.180.204.232') return 'VPS Contabo (NexusTunnel)';
  if (ip.startsWith('104.') || ip.startsWith('1.1.1.')) return 'Cloudflare';
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

function getPortLabel(port: number): string | null {
  const known: Record<number, string> = {
    22: 'SSH', 53: 'DNS', 80: 'HTTP', 443: 'HTTPS',
    631: 'Imprimante', 3000: 'Cloud1', 3001: 'NexusBuild',
    5678: 'N8N', 5679: 'N8N Worker', 8080: 'Proxy HTTP',
    9090: 'Cockpit', 18955: 'VS Code', 51984: 'VS Code',
  };
  return known[port] || null;
}

function getSpeedColor(speed: number): string {
  if (speed >= 50) return colors.success;
  if (speed >= 20) return '#22c55e';
  if (speed >= 10) return colors.orange;
  return colors.danger;
}

export default function NetworkScreen() {
  const [section, setSection] = useState<Section>('speedtest');
  const [ports, setPorts] = useState<OpenPort[]>([]);
  const [portCount, setPortCount] = useState(0);
  const [connections, setConnections] = useState<ConnectionGroup[]>([]);
  const [totalConns, setTotalConns] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Speed test
  const [speedResult, setSpeedResult] = useState<SpeedTestResult | null>(null);
  const [speedTesting, setSpeedTesting] = useState(false);
  const [speedPhase, setSpeedPhase] = useState<string>('');

  // Ping
  const [pingTarget, setPingTarget] = useState('8.8.8.8');
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [pinging, setPinging] = useState(false);

  const loadData = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const [portData, connData] = await Promise.all([
        api.getPorts(),
        api.getConnections(),
      ]);
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

  useEffect(() => { loadData(); }, []);

  const runSpeedTest = async () => {
    if (speedTesting) return;
    setSpeedTesting(true);
    setSpeedResult(null);
    setSpeedPhase('Test en cours...');
    try {
      const result = await api.speedTest();
      setSpeedResult(result);
      setSpeedPhase('');
    } catch (err: any) {
      setError(err.message);
      setSpeedPhase('');
    } finally {
      setSpeedTesting(false);
    }
  };

  const runPing = async () => {
    if (pinging || !pingTarget.trim()) return;
    setPinging(true);
    setPingResult(null);
    try {
      const result = await api.ping(pingTarget.trim());
      setPingResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPinging(false);
    }
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

  const renderSpeedTest = () => (
    <View style={styles.sectionContent}>
      {/* Bouton lancer */}
      <TouchableOpacity
        style={[styles.speedBtn, speedTesting && styles.speedBtnDisabled]}
        onPress={runSpeedTest}
        disabled={speedTesting}
      >
        {speedTesting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="speedometer" size={24} color="#fff" />
        )}
        <Text style={styles.speedBtnText}>
          {speedTesting ? speedPhase : 'Lancer le Speed Test'}
        </Text>
      </TouchableOpacity>

      {/* Résultats */}
      {speedResult && (
        <View style={styles.speedResults}>
          {/* Download */}
          <View style={styles.speedCard}>
            <View style={[styles.speedIconCircle, { backgroundColor: getSpeedColor(speedResult.download) + '20' }]}>
              <Ionicons name="arrow-down-circle" size={28} color={getSpeedColor(speedResult.download)} />
            </View>
            <Text style={styles.speedLabel}>Download</Text>
            <Text style={[styles.speedValue, { color: getSpeedColor(speedResult.download) }]}>
              {speedResult.download.toFixed(1)}
            </Text>
            <Text style={styles.speedUnit}>Mbps</Text>
          </View>

          {/* Upload */}
          <View style={styles.speedCard}>
            <View style={[styles.speedIconCircle, { backgroundColor: getSpeedColor(speedResult.upload) + '20' }]}>
              <Ionicons name="arrow-up-circle" size={28} color={getSpeedColor(speedResult.upload)} />
            </View>
            <Text style={styles.speedLabel}>Upload</Text>
            <Text style={[styles.speedValue, { color: getSpeedColor(speedResult.upload) }]}>
              {speedResult.upload.toFixed(1)}
            </Text>
            <Text style={styles.speedUnit}>Mbps</Text>
          </View>

          {/* Latence */}
          <View style={styles.speedCard}>
            <View style={[styles.speedIconCircle, { backgroundColor: colors.primaryLight + '20' }]}>
              <Ionicons name="timer" size={28} color={colors.primaryLight} />
            </View>
            <Text style={styles.speedLabel}>Latence</Text>
            <Text style={[styles.speedValue, { color: colors.primaryLight }]}>
              {speedResult.latency !== null ? speedResult.latency.toFixed(1) : '--'}
            </Text>
            <Text style={styles.speedUnit}>ms</Text>
          </View>
        </View>
      )}

      {speedResult && (
        <Text style={styles.speedTime}>
          Teste le {new Date(speedResult.testedAt).toLocaleString('fr-FR')}
        </Text>
      )}
    </View>
  );

  const renderPing = () => (
    <View style={styles.sectionContent}>
      {/* Champ cible */}
      <View style={styles.pingInputRow}>
        <TextInput
          style={styles.pingInput}
          value={pingTarget}
          onChangeText={setPingTarget}
          placeholder="IP ou domaine (ex: 192.168.1.1)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.pingBtn, pinging && styles.pingBtnDisabled]}
          onPress={runPing}
          disabled={pinging}
        >
          {pinging ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="pulse" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Raccourcis */}
      <View style={styles.pingShortcuts}>
        {[
          { label: 'Google DNS', value: '8.8.8.8' },
          { label: 'Cloudflare', value: '1.1.1.1' },
          { label: 'Box', value: '192.168.1.254' },
          { label: 'google.com', value: 'google.com' },
        ].map(s => (
          <TouchableOpacity
            key={s.value}
            style={[styles.shortcutBtn, pingTarget === s.value && styles.shortcutBtnActive]}
            onPress={() => setPingTarget(s.value)}
          >
            <Text style={[styles.shortcutText, pingTarget === s.value && styles.shortcutTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Résultats ping */}
      {pingResult && (
        <View style={styles.pingResults}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: pingResult.loss === 0 ? colors.success : colors.danger }]}>
                {pingResult.loss}%
              </Text>
              <Text style={styles.statLabel}>Perte</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {pingResult.avg !== null ? `${pingResult.avg.toFixed(1)}` : '--'}
              </Text>
              <Text style={styles.statLabel}>Moy. (ms)</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{pingResult.received}/{pingResult.transmitted}</Text>
              <Text style={styles.statLabel}>Recu</Text>
            </View>
          </View>

          {/* Min/Max */}
          {pingResult.min !== null && (
            <View style={styles.pingMinMax}>
              <Text style={styles.pingMinMaxText}>
                Min: {pingResult.min.toFixed(1)} ms  |  Max: {pingResult.max?.toFixed(1)} ms
              </Text>
            </View>
          )}

          {/* Détail pings */}
          {pingResult.pings.map((p) => (
            <View key={p.seq} style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Sequence #{p.seq}</Text>
                <Text style={styles.cardSub}>TTL: {p.ttl}  |  {p.time.toFixed(1)} ms</Text>
              </View>
              <Text style={[styles.pingTimeText, { color: p.time < 10 ? colors.success : p.time < 50 ? colors.orange : colors.danger }]}>
                {p.time.toFixed(1)} ms
              </Text>
            </View>
          ))}

          {pingResult.pings.length === 0 && (
            <View style={styles.pingFail}>
              <Ionicons name="close-circle" size={48} color={colors.danger} />
              <Text style={styles.pingFailText}>Aucune reponse de {pingResult.target}</Text>
            </View>
          )}
        </View>
      )}
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
          { id: 'speedtest', label: 'Speed', icon: 'speedometer' },
          { id: 'ping', label: 'Ping', icon: 'pulse' },
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
        {section === 'speedtest' && renderSpeedTest()}
        {section === 'ping' && renderPing()}
        {section === 'ports' && (loading && ports.length === 0 ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={styles.emptyText}>Chargement...</Text>
          </View>
        ) : error && ports.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="alert-circle-outline" size={64} color={colors.danger} />
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
              <Text style={styles.retryBtnText}>Reessayer</Text>
            </TouchableOpacity>
          </View>
        ) : renderPorts())}
        {section === 'connections' && (loading && connections.length === 0 ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={styles.emptyText}>Chargement...</Text>
          </View>
        ) : renderConnections())}
      </ScrollView>
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
    paddingVertical: 10, borderRadius: 8, gap: 4,
  },
  tabActive: { backgroundColor: colors.primary + '30' },
  tabText: { fontSize: 12, color: colors.textMuted },
  tabTextActive: { color: colors.primaryLight, fontWeight: '600' },
  scrollView: { flex: 1 },
  sectionContent: { paddingHorizontal: 16, paddingBottom: 40 },
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
  // Speed Test styles
  speedBtn: {
    backgroundColor: colors.primary, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 18,
    borderRadius: 16, gap: 10, marginBottom: 20,
  },
  speedBtnDisabled: { backgroundColor: '#1e40af', opacity: 0.7 },
  speedBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  speedResults: {
    flexDirection: 'row', gap: 10, marginBottom: 12,
  },
  speedCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: 16,
    padding: 16, alignItems: 'center',
  },
  speedIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  speedLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  speedValue: { fontSize: 22, fontWeight: 'bold' },
  speedUnit: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  speedTime: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  // Ping styles
  pingInputRow: {
    flexDirection: 'row', gap: 10, marginBottom: 12,
  },
  pingInput: {
    flex: 1, backgroundColor: colors.card, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, color: colors.text,
    fontSize: 15, borderWidth: 1, borderColor: colors.primary + '40',
  },
  pingBtn: {
    backgroundColor: colors.primary, width: 52, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  pingBtnDisabled: { backgroundColor: '#1e40af', opacity: 0.7 },
  pingShortcuts: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
  },
  shortcutBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary + '30',
  },
  shortcutBtnActive: { backgroundColor: colors.primary + '30', borderColor: colors.primaryLight },
  shortcutText: { fontSize: 13, color: colors.textSecondary },
  shortcutTextActive: { color: colors.primaryLight, fontWeight: '600' },
  pingResults: { marginTop: 8 },
  pingMinMax: {
    backgroundColor: colors.card, borderRadius: 10, padding: 12,
    alignItems: 'center', marginBottom: 12,
  },
  pingMinMaxText: { fontSize: 13, color: colors.textSecondary },
  pingTimeText: { fontSize: 14, fontWeight: 'bold' },
  pingFail: { alignItems: 'center', paddingVertical: 30 },
  pingFailText: { color: colors.danger, fontSize: 15, marginTop: 10, textAlign: 'center' },
});
