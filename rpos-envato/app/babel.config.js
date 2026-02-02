module.exports = function (api) {
  api.cache(true);

  const isTest = process.env.NODE_ENV === 'test';

  const plugins = [
    // Transform import.meta for web compatibility
    'babel-plugin-transform-import-meta',
    [
      'module-resolver',
      {
        root: ['./'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@features': './src/features',
          '@services': './src/services',
          '@store': './src/store',
          '@hooks': './src/hooks',
          '@utils': './src/utils',
          '@types': './src/types',
          '@assets': './assets',
          '@common': './src/app/common',
          '@actions': './src/app/actions',
        },
      },
    ],
  ];

  // Only add Tamagui babel plugin in non-test environments
  if (!isTest) {
    plugins.unshift([
      '@tamagui/babel-plugin',
      {
        components: ['tamagui'],
        config: './tamagui.config.ts',
        logTimings: true,
        disableExtraction: process.env.NODE_ENV === 'development',
      },
    ]);
  }

  // Reanimated plugin must be last
  plugins.push('react-native-reanimated/plugin');

  return {
    presets: [
      'module:@react-native/babel-preset',
    ],
    plugins,
  };
};
