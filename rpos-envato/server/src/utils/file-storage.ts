import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Storage configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export interface StorageResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

/**
 * Upload file to storage (local filesystem by default)
 * Can be extended to use S3, Firebase Storage, etc.
 */
export async function uploadToStorage(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<StorageResult> {
  const ext = path.extname(filename) || getExtensionFromMime(mimeType);
  const key = `${uuidv4()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, key);

  await fs.promises.writeFile(filePath, buffer);

  // In production, this would return a CDN URL or S3 URL
  const baseUrl = process.env.API_URL || 'http://localhost:3000';
  const url = `${baseUrl}/uploads/${key}`;

  return {
    url,
    key,
    size: buffer.length,
    mimeType,
  };
}

/**
 * Delete file from storage
 */
export async function deleteFromStorage(key: string): Promise<boolean> {
  try {
    const filePath = path.join(UPLOAD_DIR, key);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Get file from storage
 */
export async function getFromStorage(key: string): Promise<Buffer | null> {
  try {
    const filePath = path.join(UPLOAD_DIR, key);

    if (fs.existsSync(filePath)) {
      return await fs.promises.readFile(filePath);
    }

    return null;
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMime(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'application/json': '.json',
    'text/plain': '.txt',
    'text/csv': '.csv',
  };

  return mimeToExt[mimeType] || '';
}
