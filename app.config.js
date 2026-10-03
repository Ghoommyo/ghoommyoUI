// Extends app.json. The Google Maps key (Android only) comes from the environment so it
// isn't committed: set GOOGLE_MAPS_API_KEY locally or as an EAS environment variable.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY },
    },
  },
});
