const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add tamagui support
config.resolver.sourceExts.push('mjs');

// Enable package exports for ESM modules
config.resolver.unstable_enablePackageExports = true;

// Transform node_modules that use import.meta
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('./metro-transformer.js'),
};

// Custom resolver for web platform
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // For web platform, block native-only react-native internals
  if (platform === 'web' && moduleName.startsWith('react-native/Libraries/')) {
    return { type: 'empty' };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
