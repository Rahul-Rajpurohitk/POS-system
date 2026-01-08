import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { asyncHandler } from '../middlewares/error.middleware';
import { AppDataSource } from '../config/database';
import { File } from '../entities/File.entity';

const fileRepository = AppDataSource.getRepository(File);

const ASSETS_DIR = path.join(__dirname, '../../public/images');

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// MIME type mapping
const mimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

/**
 * Get asset by filename
 * GET /assets/:filename
 */
export const getAsset = asyncHandler(async (req: Request, res: Response) => {
  const { filename } = req.params;

  // Sanitize filename to prevent directory traversal
  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(ASSETS_DIR, sanitizedFilename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'Asset not found',
    });
  }

  // Get file extension and MIME type
  const ext = path.extname(sanitizedFilename).toLowerCase();
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  // Set cache headers for static assets
  res.set({
    'Content-Type': mimeType,
    'Cache-Control': 'public, max-age=31536000', // 1 year cache
    'ETag': `"${sanitizedFilename}"`,
  });

  // Check for conditional request
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch === `"${sanitizedFilename}"`) {
    return res.status(304).end();
  }

  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

/**
 * Get asset thumbnail
 * GET /assets/:filename/thumbnail
 */
export const getThumbnail = asyncHandler(async (req: Request, res: Response) => {
  const { filename } = req.params;
  const width = parseInt(req.query.w as string) || 200;
  const height = parseInt(req.query.h as string) || 200;

  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(ASSETS_DIR, sanitizedFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'Asset not found',
    });
  }

  // For now, just return the original file
  // In production, you'd use sharp or similar for thumbnail generation
  const ext = path.extname(sanitizedFilename).toLowerCase();
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  res.set({
    'Content-Type': mimeType,
    'Cache-Control': 'public, max-age=31536000',
  });

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

/**
 * Check if asset exists
 * HEAD /assets/:filename
 */
export const checkAsset = asyncHandler(async (req: Request, res: Response) => {
  const { filename } = req.params;

  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(ASSETS_DIR, sanitizedFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).end();
  }

  const stats = fs.statSync(filePath);
  const ext = path.extname(sanitizedFilename).toLowerCase();
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  res.set({
    'Content-Type': mimeType,
    'Content-Length': stats.size.toString(),
    'Last-Modified': stats.mtime.toUTCString(),
  });

  res.status(200).end();
});

export default {
  getAsset,
  getThumbnail,
  checkAsset,
};
