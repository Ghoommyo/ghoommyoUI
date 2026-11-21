// Play reads some manifest entries as hardware the phone must have, and then hides the app
// from devices without it. Portrait-only screens imply android.hardware.screen.portrait, and
// NetInfo's ACCESS_WIFI_STATE permission implies android.hardware.wifi. Neither is needed to
// run the app, so both are declared optional.
const { withAndroidManifest } = require('expo/config-plugins');

const OPTIONAL = ['android.hardware.screen.portrait', 'android.hardware.wifi'];

module.exports = (config) =>
  withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const features = (manifest['uses-feature'] ??= []);
    for (const name of OPTIONAL) {
      const existing = features.find((f) => f.$['android:name'] === name);
      if (existing) existing.$['android:required'] = 'false';
      else features.push({ $: { 'android:name': name, 'android:required': 'false' } });
    }
    return mod;
  });
