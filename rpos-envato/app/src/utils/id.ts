import { v4 as uuidv4 } from 'uuid';
import type { LocalID, ID } from '@/types';

/**
 * Generate a local ID for offline items
 * Format: 'local-{uuid}'
 * Matches original app's ID generation pattern
 */
export function generateLocalId(): LocalID {
  return `local-${uuidv4()}` as LocalID;
}

/**
 * Check if an ID is a local (offline) ID
 */
export function isLocalId(id: ID): boolean {
  return id.startsWith('local-');
}

/**
 * Generate a local order number
 * Format: '# LOCAL-{random}'
 * Matches original app's order number pattern
 */
export function generateLocalOrderNumber(length: number = 8): string {
  const chars = '0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `# LOCAL-${result}`;
}

/**
 * Generate a random alphanumeric string
 */
export function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Extract the UUID part from a local ID
 */
export function extractUuidFromLocalId(localId: LocalID): string {
  return localId.replace('local-', '');
}
