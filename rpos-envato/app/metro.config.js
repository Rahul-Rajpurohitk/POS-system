const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add tamagui support
config.resolver.sourceExts.push('mjs');

// Enable package exports for ESM modules (fixes import.meta issues)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
