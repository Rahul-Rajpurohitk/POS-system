// App configuration
const DEV_API_URL = 'http://localhost:3000/api';
const PROD_API_URL = 'http://localhost:3000/api'; // Update for production

export const config = {
  apiUrl: __DEV__ ? DEV_API_URL : PROD_API_URL,
  socketUrl: __DEV__ ? 'http://localhost:3000' : 'http://localhost:3000',
  appName: 'RPOS',
  version: '1.0.0',
  defaultCurrency: 'USD',
  defaultLanguage: 'en',
};

export default config;
