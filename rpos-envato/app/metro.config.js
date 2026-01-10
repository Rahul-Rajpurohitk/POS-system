const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add tamagui support
config.resolver.sourceExts.push('mjs');

module.exports = config;
