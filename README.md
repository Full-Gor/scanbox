# ScanBox - WiFi Scanner

Application mobile Android pour scanner et analyser les réseaux WiFi environnants.

## Description

ScanBox permet de :
- Scanner les réseaux WiFi à proximité
- Afficher la puissance du signal (dBm)
- Identifier le type de sécurité (WPA3, WPA2, WPA, WEP, Ouvert)
- Voir la bande de fréquence (2.4GHz / 5GHz)
- Afficher le canal et l'adresse MAC (BSSID)

---

## Ce qui a été fait

### Interface utilisateur
| Fonctionnalité | Status |
|----------------|--------|
| Header avec titre et sous-titre | ✅ |
| Bouton "Scanner" | ✅ |
| Liste des réseaux WiFi | ✅ |
| Pull-to-refresh | ✅ |
| Indicateur de signal (barres colorées) | ✅ |
| Icône de sécurité (cadenas) | ✅ |
| Badge fréquence (2.4GHz/5GHz) | ✅ |
| Affichage BSSID | ✅ |
| Compteur de réseaux | ✅ |
| Gestion des erreurs | ✅ |

### Technique
| Élément | Status |
|---------|--------|
| Structure Expo SDK 52 | ✅ |
| React Native 0.76.5 | ✅ |
| Plugin expo-build-properties | ✅ |
| Plugin custom withWifiReborn | ✅ |
| Permissions Android (Location, WiFi) | ✅ |
| Intégration react-native-wifi-reborn | ✅ |
| Theme sombre | ✅ |
| Icône app (WiFi shield) | ✅ |

### Fichiers
```
scanbox/
├── App.js              # Code principal avec vrai scan WiFi
├── App.tsx             # Version alternative (données mockées)
├── app.json            # Config Expo
├── package.json        # Dépendances
├── babel.config.js     # Config Babel
├── plugins/
│   └── withWifiReborn.js   # Plugin Expo pour permissions
└── assets/
    ├── icon.png            # Icône app
    ├── adaptive-icon.png   # Icône adaptive Android
    └── splash-icon.png     # Splash screen
```

---

## Ce qui reste à faire

### Priorité haute
| Fonctionnalité | Description |
|----------------|-------------|
| Tester le vrai scan | Le module react-native-wifi-reborn doit être testé sur device réel |
| Connexion à un réseau | Ajouter la possibilité de se connecter à un réseau sélectionné |
| Détails du réseau | Afficher plus d'infos (vendor, canal exact, largeur de bande) |

### Priorité moyenne
| Fonctionnalité | Description |
|----------------|-------------|
| Historique des scans | Sauvegarder les scans précédents |
| Export des résultats | Exporter en JSON/CSV |
| Filtres | Filtrer par sécurité, bande, puissance |
| Tri | Trier par nom, signal, fréquence |
| Scan automatique | Rafraîchir toutes les X secondes |

### Priorité basse
| Fonctionnalité | Description |
|----------------|-------------|
| Carte des réseaux | Visualisation géographique si GPS actif |
| Détection de canaux encombrés | Analyse des interférences |
| Mode sombre/clair | Toggle theme |
| Notifications | Alerte si nouveau réseau détecté |
| Widget | Widget Android pour scan rapide |

---

## Problèmes connus

### Build
- Le build peut échouer si les icônes PNG sont corrompues ou trop petites
- Les icônes doivent être au minimum 1024x1024 pour l'app store

### Runtime
- `react-native-wifi-reborn` nécessite les permissions de localisation activées
- Le scan WiFi ne fonctionne pas sur émulateur (device réel requis)
- Sur Android 10+, la localisation doit être en mode "Précis"

---

## Installation

```bash
# Cloner le repo
git clone git@github.com:Full-Gor/scanbox.git
cd scanbox

# Installer les dépendances
npm install

# Générer le dossier android
npx expo prebuild

# Lancer sur device
npx expo run:android
```

## Build APK

Via NexusBuild :
```bash
curl -X POST http://localhost:3001/api/builds \
  -H "Authorization: Bearer nexusbuild-bot-secret" \
  -H "Content-Type: application/json" \
  -d '{"repository": "git@github.com:Full-Gor/scanbox.git", "branch": "main", "framework": "expo"}'
```

---

## Dépendances

| Package | Version | Description |
|---------|---------|-------------|
| expo | ~52.0.0 | Framework |
| react-native | 0.76.5 | Core |
| react-native-wifi-reborn | ^4.12.1 | Scan WiFi natif |
| @react-native-async-storage/async-storage | 1.23.1 | Stockage local |
| expo-build-properties | ~0.13.3 | Config build Android |

---

## Permissions Android

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>
<uses-permission android:name="android.permission.CHANGE_WIFI_STATE"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
```

---

## Changelog

### v1.0.0 (04/02/2026)
- Interface de scan WiFi complète
- Intégration react-native-wifi-reborn
- Affichage signal, sécurité, fréquence
- Theme sombre
- Icône WiFi shield

---

*Projet créé pour NexusBuild - Full-Gor*
