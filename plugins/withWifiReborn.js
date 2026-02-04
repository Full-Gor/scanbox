const { withAndroidManifest, withSettingsGradle, withAppBuildGradle } = require('@expo/config-plugins');

const withWifiReborn = (config) => {
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

  return config;
};

module.exports = withWifiReborn;
