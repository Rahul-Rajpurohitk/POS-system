/**
 * Jest Setup - Load environment before tests
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Set test-specific environment variables if needed
process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
jest.setTimeout(30000);
