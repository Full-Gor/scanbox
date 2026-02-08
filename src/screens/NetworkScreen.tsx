import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  RefreshControl, ActivityIndicator, ScrollView, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config';
import { OpenPort, ConnectionGroup, ServiceStatus, SpeedTestResult, PingResult } from '../types';
import { api } from '../services/api';

type Section = 'speedtest' | 'ping' | 'services' | 'ports' | 'connections';

// Labels intelligents pour les IPs connues
function getConnectionLabel(ip: string, processes: string[]): string | null {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    if (processes.some(p => p.includes('node'))) return 'Services locaux (Node.js)';
    return 'Localhost';
  }
  if (ip.startsWith('192.168.')) return `Reseau local (${ip})`;
  if (ip.startsWith('2a00:1450:') || ip.startsWith('142.250.') || ip.startsWith('172.217.')) return 'Google';
  if (ip === '207.180.204.232') return 'VPS Contabo (NexusTunnel)';
  if (ip.startsWith('104.') || ip.startsWith('1.1.1.')) return 'Serveur Internet';
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

export default function NetworkScreen() {
  const [section, setSection] = useState<Section>('speedtest');
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [ports, setPorts] = useState<OpenPort[]>([]);
  const [portCount, setPortCount] = useState(0);
  const [connections, setConnections] = useState<ConnectionGroup[]>([]);
  const [totalConns, setTotalConns] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Speed test state
  const [speedResult, setSpeedResult] = useState<SpeedTestResult | null>(null);
  const [speedTesting, setSpeedTesting] = useState(false);

  // Ping state
  const [pingTarget, setPingTarget] = useState('');
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [pinging, setPinging] = useState(false);

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

  useEffect(() => { loadData(); }, []);

  const runSpeedTest = async () => {
    if (speedTesting) return;
    setSpeedTesting(true);
    setSpeedResult(null);
    setError(null);
    try {
      const result = await api.speedTest();
      setSpeedResult(result);
    } catch (err: any) {
      setError(err.message || 'Erreur speed test');
    } finally {
      setSpeedTesting(false);
    }
  };

  const runPing = async () => {
    if (pinging || !pingTarget.trim()) return;
    setPinging(true);
    setPingResult(null);
    setError(null);
    try {
      const result = await api.ping(pingTarget.trim());
      setPingResult(result);
    } catch (err: any) {
      setError(err.message || 'Erreur ping');
    } finally {
      setPinging(false);
    }
  };

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

  const getSpeedQuality = (speed: number): { label: string; color: string } => {
    if (speed >= 50) return { label: 'Excellent', color: colors.success };
    if (speed >= 20) return { label: 'Bon', color: '#4ade80' };
    if (speed >= 5) return { label: 'Moyen', color: colors.warning };
    return { label: 'Faible', color: colors.danger };
  };

  const getLatencyQuality = (latency: number): { label: string; color: string } => {
    if (latency <= 20) return { label: 'Excellent', color: colors.success };
    if (latency <= 50) return { label: 'Bon', color: '#4ade80' };
    if (latency <= 100) return { label: 'Moyen', color: colors.warning };
    return { label: 'Eleve', color: colors.danger };
  };

  const renderSpeedTest = () => (
    <View style={styles.sectionContent}>
      {!speedResult && !speedTesting && (
        <View style={styles.speedStartContainer}>
          <View style={styles.speedCircle}>
            <Ionicons name="speedometer" size={64} color={colors.primaryLight} />
          </View>
          <Text style={styles.speedStartTitle}>Test de debit</Text>
          <Text style={styles.speedStartSub}>Mesurez la vitesse de votre connexion internet</Text>
          <TouchableOpacity style={styles.speedStartBtn} onPress={runSpeedTest}>
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.speedStartBtnText}>Demarrer</Text>
          </TouchableOpacity>
        </View>
      )}

      {speedTesting && (
        <View style={styles.speedStartContainer}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
          <Text style={[styles.speedStartTitle, { marginTop: 20 }]}>Test en cours...</Text>
          <Text style={styles.speedStartSub}>Telechargement et upload en cours, patientez ~15s</Text>
        </View>
      )}

      {speedResult && !speedTesting && (
        <>
          <View style={styles.speedCard}>
            <View style={styles.speedCardHeader}>
              <Ionicons name="arrow-down-circle" size={28} color={colors.success} />
              <Text style={styles.speedCardLabel}>Download</Text>
            </View>
            <Text style={[styles.speedValue, { color: getSpeedQuality(speedResult.download).color }]}>
              {speedResult.download}
            </Text>
            <Text style={styles.speedUnit}>Mbps</Text>
            <View style={[styles.qualityBadge, { backgroundColor: getSpeedQuality(speedResult.download).color + '20' }]}>
              <Text style={[styles.qualityText, { color: getSpeedQuality(speedResult.download).color }]}>
                {getSpeedQuality(speedResult.download).label}
              </Text>
            </View>
          </View>

          <View style={styles.speedCard}>
            <View style={styles.speedCardHeader}>
              <Ionicons name="arrow-up-circle" size={28} color={colors.primary} />
              <Text style={styles.speedCardLabel}>Upload</Text>
            </View>
            <Text style={[styles.speedValue, { color: getSpeedQuality(speedResult.upload).color }]}>
              {speedResult.upload}
            </Text>
            <Text style={styles.speedUnit}>Mbps</Text>
            <View style={[styles.qualityBadge, { backgroundColor: getSpeedQuality(speedResult.upload).color + '20' }]}>
              <Text style={[styles.qualityText, { color: getSpeedQuality(speedResult.upload).color }]}>
                {getSpeedQuality(speedResult.upload).label}
              </Text>
            </View>
          </View>

          {speedResult.latency !== null && (
            <View style={styles.speedCard}>
              <View style={styles.speedCardHeader}>
                <Ionicons name="timer" size={28} color={colors.orange} />
                <Text style={styles.speedCardLabel}>Latence</Text>
              </View>
              <Text style={[styles.speedValue, { color: getLatencyQuality(speedResult.latency).color }]}>
                {speedResult.latency}
              </Text>
              <Text style={styles.speedUnit}>ms</Text>
              <View style={[styles.qualityBadge, { backgroundColor: getLatencyQuality(speedResult.latency).color + '20' }]}>
                <Text style={[styles.qualityText, { color: getLatencyQuality(speedResult.latency).color }]}>
                  {getLatencyQuality(speedResult.latency).label}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.retestBtn} onPress={runSpeedTest}>
            <Ionicons name="refresh" size={20} color={colors.primaryLight} />
            <Text style={styles.retestBtnText}>Relancer le test</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderPing = () => (
    <View style={styles.sectionContent}>
      <View style={styles.pingInputRow}>
        <TextInput
          style={styles.pingInput}
          placeholder="IP ou domaine (ex: google.com)"
          placeholderTextColor={colors.textMuted}
          value={pingTarget}
          onChangeText={setPingTarget}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.pingBtn, (!pingTarget.trim() || pinging) && styles.pingBtnDisabled]}
          onPress={runPing}
          disabled={!pingTarget.trim() || pinging}
        >
          {pinging ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6, marginLeft: 4 }}>Tester un site ou appareil :</Text>
      <View style={styles.pingShortcuts}>
        {[
          { label: 'Mon Internet', value: '8.8.8.8' },
          { label: 'Ma Box WiFi', value: '192.168.1.254' },
          { label: 'google.com', value: 'google.com' },
          { label: 'Mon PC', value: '192.168.1.144' },
        ].map(shortcut => (
          <TouchableOpacity
            key={shortcut.value}
            style={styles.shortcutChip}
            onPress={() => setPingTarget(shortcut.value)}
          >
            <Text style={styles.shortcutText}>{shortcut.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {pingResult && (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: pingResult.loss === 0 ? colors.success : colors.danger }]}>
                {pingResult.loss}%
              </Text>
              <Text style={styles.statLabel}>Perte</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {pingResult.avg !== null ? `${pingResult.avg}` : '-'}
              </Text>
              <Text style={styles.statLabel}>Moy. (ms)</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {pingResult.received}/{pingResult.transmitted}
              </Text>
              <Text style={styles.statLabel}>Recu</Text>
            </View>
          </View>

          {pingResult.min !== null && (
            <View style={styles.pingMinMax}>
              <View style={styles.pingMinMaxItem}>
                <Text style={styles.pingMinMaxLabel}>Min</Text>
                <Text style={[styles.pingMinMaxValue, { color: colors.success }]}>{pingResult.min} ms</Text>
              </View>
              <View style={styles.pingMinMaxSep} />
              <View style={styles.pingMinMaxItem}>
                <Text style={styles.pingMinMaxLabel}>Moy</Text>
                <Text style={[styles.pingMinMaxValue, { color: colors.primaryLight }]}>{pingResult.avg} ms</Text>
              </View>
              <View style={styles.pingMinMaxSep} />
              <View style={styles.pingMinMaxItem}>
                <Text style={styles.pingMinMaxLabel}>Max</Text>
                <Text style={[styles.pingMinMaxValue, { color: colors.danger }]}>{pingResult.max} ms</Text>
              </View>
            </View>
          )}

          {pingResult.pings.map((p, i) => (
            <View key={i} style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: colors.success + '20' }]}>
                <Text style={{ color: colors.success, fontWeight: 'bold', fontSize: 14 }}>#{p.seq}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{pingResult.target}</Text>
                <Text style={styles.cardSub}>TTL={p.ttl}</Text>
              </View>
              <Text style={[styles.pingTime, { color: p.time < 50 ? colors.success : p.time < 100 ? colors.warning : colors.danger }]}>
                {p.time} ms
              </Text>
            </View>
          ))}

          {pingResult.pings.length === 0 && (
            <View style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: colors.danger + '20' }]}>
                <Ionicons name="close" size={22} color={colors.danger} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Hote injoignable</Text>
                <Text style={styles.cardSub}>{pingResult.target} ne repond pas</Text>
              </View>
            </View>
          )}
        </>
      )}

      {!pingResult && !pinging && (
        <View style={styles.pingPlaceholder}>
          <Ionicons name="pulse" size={48} color={colors.textMuted} />
          <Text style={styles.pingPlaceholderText}>Testez si un appareil ou un site repond{'\n'}Utilisez les raccourcis ou tapez une adresse</Text>
        </View>
      )}
    </View>
  );

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

  const tabs: { id: Section; label: string; icon: string }[] = [
    { id: 'speedtest', label: 'Debit', icon: 'speedometer' },
    { id: 'ping', label: 'Ping', icon: 'pulse' },
    { id: 'services', label: 'Services', icon: 'server' },
    { id: 'ports', label: 'Ports', icon: 'radio-button-on' },
    { id: 'connections', label: 'Connexions', icon: 'git-network' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
        {tabs.map(tab => (
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
      </ScrollView>

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
        {section === 'services' && (
          loading && services.length === 0 ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={colors.primaryLight} />
              <Text style={styles.emptyText}>Chargement...</Text>
            </View>
          ) : error && services.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="alert-circle-outline" size={64} color={colors.danger} />
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
                <Text style={styles.retryBtnText}>Reessayer</Text>
              </TouchableOpacity>
            </View>
          ) : renderServices()
        )}
        {section === 'ports' && (
          loading && ports.length === 0 ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={colors.primaryLight} />
              <Text style={styles.emptyText}>Chargement...</Text>
            </View>
          ) : renderPorts()
        )}
        {section === 'connections' && renderConnections()}
      </ScrollView>

      {(section === 'services' || section === 'ports' || section === 'connections') && (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabsScroll: { maxHeight: 52, marginBottom: 8 },
  tabsContent: {
    flexDirection: 'row', paddingHorizontal: 12, gap: 6,
    backgroundColor: colors.card, paddingVertical: 6,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, gap: 5,
  },
  tabActive: { backgroundColor: colors.primary + '30' },
  tabText: { fontSize: 12, color: colors.textMuted },
  tabTextActive: { color: colors.primaryLight, fontWeight: '600' },
  scrollView: { flex: 1 },
  sectionContent: { paddingHorizontal: 16, paddingBottom: 120 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
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
  // Speed test
  speedStartContainer: { alignItems: 'center', paddingVertical: 60 },
  speedCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.primary + '40',
  },
  speedStartTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginTop: 24 },
  speedStartSub: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  speedStartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 12, marginTop: 24,
  },
  speedStartBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  speedCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 20,
    marginBottom: 12, alignItems: 'center',
  },
  speedCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  speedCardLabel: { fontSize: 16, color: colors.textSecondary, fontWeight: '500' },
  speedValue: { fontSize: 48, fontWeight: 'bold' },
  speedUnit: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  qualityBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  qualityText: { fontSize: 13, fontWeight: '600' },
  retestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary,
    paddingVertical: 14, borderRadius: 12, marginTop: 8,
  },
  retestBtnText: { color: colors.primaryLight, fontSize: 15, fontWeight: '600' },
  // Ping
  pingInputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  pingInput: {
    flex: 1, backgroundColor: colors.card, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, color: colors.text, fontSize: 15,
    borderWidth: 1, borderColor: colors.border,
  },
  pingBtn: {
    backgroundColor: colors.primary, width: 50, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  pingBtnDisabled: { opacity: 0.5 },
  pingShortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  shortcutChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  shortcutText: { fontSize: 13, color: colors.textSecondary },
  pingTime: { fontSize: 15, fontWeight: 'bold' },
  pingMinMax: {
    flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12,
    padding: 14, marginBottom: 12, justifyContent: 'space-around', alignItems: 'center',
  },
  pingMinMaxItem: { alignItems: 'center' },
  pingMinMaxLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  pingMinMaxValue: { fontSize: 16, fontWeight: 'bold' },
  pingMinMaxSep: { width: 1, height: 30, backgroundColor: colors.border },
  pingPlaceholder: { alignItems: 'center', paddingVertical: 60 },
  pingPlaceholderText: { color: colors.textMuted, fontSize: 14, marginTop: 16, textAlign: 'center' },
});
