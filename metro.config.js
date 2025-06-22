const { getDefaultConfig } = require('expo/metro-config');

// expo-notifications 경고 차단
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  const message = String(args[0] || '');
  if (message.includes('expo-notifications') || 
      message.includes('functionality is not fully supported') ||
      message.includes('Android Push notifications') ||
      message.includes('remote notifications') ||
      message.includes('development build instead')) {
    return;
  }
  originalWarn.apply(console, args);
};

console.error = (...args) => {
  const message = String(args[0] || '');
  if (message.includes('expo-notifications') || 
      message.includes('Android Push notifications') ||
      message.includes('remote notifications') ||
      message.includes('development build instead')) {
    return;
  }
  originalError.apply(console, args);
};

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  return {
    ...config,
    transformer: {
      ...config.transformer,
      assetPlugins: ['expo-asset/tools/hashAssetFiles'],
    },
  };
})();