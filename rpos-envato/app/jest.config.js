// Shared configuration
const baseConfig = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@tanstack|tamagui|@tamagui|expo|@expo|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|zustand)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  globals: {
    __DEV__: true,
  },
};

module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  projects: [
    {
      ...baseConfig,
      displayName: 'unit',
      preset: 'react-native',
      testMatch: ['<rootDir>/src/__tests__/**/*.test.{ts,tsx}'],
      testPathIgnorePatterns: ['<rootDir>/src/__tests__/integration/'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
      testEnvironment: 'node',
    },
    {
      ...baseConfig,
      displayName: 'integration',
      preset: 'react-native',
      testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration/setup.integration.ts'],
      testEnvironment: 'node',
    },
  ],
};
