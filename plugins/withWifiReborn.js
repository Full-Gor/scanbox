const { withAndroidManifest, withSettingsGradle, withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const { resolve } = require('path');
const { readFileSync, writeFileSync, existsSync } = require('fs');

const withWifiReborn = (config) => {
  // Add manifest permissions
  config = withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.CHANGE_WIFI_STATE',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_NETWORK_STATE',
    ];

    permissions.forEach((perm) => {
      if (!manifest['uses-permission'].find((p) => p.$['android:name'] === perm)) {
        manifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    });

    return config;
  });

  // Fix react-native-wifi-reborn build.gradle for AGP 8 compatibility
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const wifiRebornPath = resolve(
        config.modRequest.projectRoot,
        'node_modules/react-native-wifi-reborn/android/build.gradle'
      );

      if (existsSync(wifiRebornPath)) {
        let buildGradle = readFileSync(wifiRebornPath, 'utf-8');

        // Add namespace if missing (required for AGP 8+)
        if (!buildGradle.includes('namespace')) {
          buildGradle = buildGradle.replace(
            /android\s*\{/,
            'android {\n    namespace "com.reactlibrary"'
          );
        }

        // Fix compileSdkVersion to use integer instead of property if it causes issues
        if (buildGradle.includes('compileSdkVersion safeExtGet')) {
          buildGradle = buildGradle.replace(
            /compileSdkVersion safeExtGet\([^)]+\)/g,
            'compileSdkVersion 34'
          );
        }

        // Fix buildToolsVersion similarly
        if (buildGradle.includes('buildToolsVersion safeExtGet')) {
          buildGradle = buildGradle.replace(
            /buildToolsVersion safeExtGet\([^)]+\)/g,
            'buildToolsVersion "34.0.0"'
          );
        }

        writeFileSync(wifiRebornPath, buildGradle);
      }

      return config;
    },
  ]);

  return config;
};

module.exports = withWifiReborn;
