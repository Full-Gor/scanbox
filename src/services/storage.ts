import AsyncStorage from '@react-native-async-storage/async-storage';
import { WifiNetwork, ScanHistoryItem } from '../types';

const HISTORY_KEY = 'scanbox_history';
const FAVORITES_KEY = 'scanbox_favorites';

// Historique local des scans
export async function getLocalHistory(): Promise<ScanHistoryItem[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveLocalHistory(scan: ScanHistoryItem): Promise<void> {
  try {
    const history = await getLocalHistory();
    history.unshift(scan);
    // Garder max 50 scans locaux
    const trimmed = history.slice(0, 50);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Erreur sauvegarde historique:', error);
  }
}

// Favoris (reseaux sauvegardes)
export async function getFavorites(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function toggleFavorite(bssid: string): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    const index = favorites.indexOf(bssid);
    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(bssid);
    }
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    return index === -1; // true si ajoute, false si retire
  } catch {
    return false;
  }
}
