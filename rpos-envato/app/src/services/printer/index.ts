import { Platform } from 'react-native';

export * from './types';

// Platform-specific printer service
export const printerService = Platform.select({
  web: () => require('./web').printerService,
  default: () => require('./bluetooth.native').printerService,
})();
