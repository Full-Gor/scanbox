import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import ScanScreen from './src/screens/ScanScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import NetworkScreen from './src/screens/NetworkScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { colors } from './src/config';

type TabType = 'scan' | 'devices' | 'network' | 'history';

interface Tab {
  id: TabType;
  label: string;
  icon: string;
  iconActive: string;
}

const tabs: Tab[] = [
  { id: 'scan', label: 'WiFi', icon: 'wifi-outline', iconActive: 'wifi' },
  { id: 'devices', label: 'Appareils', icon: 'hardware-chip-outline', iconActive: 'hardware-chip' },
  { id: 'network', label: 'Reseau', icon: 'globe-outline', iconActive: 'globe' },
  { id: 'history', label: 'Historique', icon: 'time-outline', iconActive: 'time' },
];

const subtitles: Record<TabType, string> = {
  scan: 'Scanner WiFi',
  devices: 'Appareils connectes',
  network: 'Ports, services & connexions',
  history: 'Historique',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('scan');

  const renderScreen = () => {
    switch (activeTab) {
      case 'scan': return <ScanScreen />;
      case 'devices': return <DevicesScreen />;
      case 'network': return <NetworkScreen />;
      case 'history': return <HistoryScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ScanBox</Text>
        <Text style={styles.subtitle}>{subtitles[activeTab]}</Text>
      </View>

      {/* Screen content */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* Bottom tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={(activeTab === tab.id ? tab.iconActive : tab.icon) as any}
              size={22}
              color={activeTab === tab.id ? colors.primaryLight : colors.textMuted}
            />
            <Text style={[
              styles.tabLabel,
              activeTab === tab.id && styles.tabLabelActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.background,
    paddingBottom: 20,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  tabLabelActive: {
    color: colors.primaryLight,
    fontWeight: '600',
  },
});
