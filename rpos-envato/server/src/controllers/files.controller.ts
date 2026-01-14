import { Response } from 'express';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import { AuthenticatedRequest } from '../types';
import { AppDataSource } from '../config/database';
import { File } from '../entities/File.entity';
import { MediaType } from '../types/enums';
import { uploadToStorage, deleteFromStorage } from '../utils/file-storage';

const fileRepository = AppDataSource.getRepository(File);

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

/**
 * Upload image file
 * POST /files/upload
 */
export const uploadImage = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file provided',
    });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const fileName = `${uuidv4()}${ext}`;

  // Upload to storage (local or cloud)
  const result = await uploadToStorage(req.file.buffer, fileName, req.file.mimetype);

  // Save file record
  const file = fileRepository.create({
    path: result.url,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    type: MediaType.IMAGE,
  });

  await fileRepository.save(file);

  res.status(201).json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      id: file.id,
      url: file.path,
      mimeType: file.mimeType,
      size: file.size,
    },
  });
});

/**
 * Upload multiple images
 * POST /files/upload-multiple
 */
export const uploadMultiple = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files provided',
    });
  }

  const uploadedFiles = [];

  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();
    const fileName = `${uuidv4()}${ext}`;

    const result = await uploadToStorage(file.buffer, fileName, file.mimetype);

    const fileRecord = fileRepository.create({
      path: result.url,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      type: MediaType.IMAGE,
    });

    await fileRepository.save(fileRecord);

    uploadedFiles.push({
      id: fileRecord.id,
      url: fileRecord.path,
      mimeType: fileRecord.mimeType,
      size: fileRecord.size,
    });
  }

  res.status(201).json({
    success: true,
    message: 'Files uploaded successfully',
    data: uploadedFiles,
  });
});

/**
 * Get file by ID
 * GET /files/:id
 */
export const getFile = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const file = await fileRepository.findOne({
    where: { id },
  });

  if (!file) {
    return res.status(404).json({
      success: false,
      message: 'File not found',
    });
  }

  res.json({
    success: true,
    data: {
      id: file.id,
      originalName: file.originalName,
      url: file.path,
      mimeType: file.mimeType,
      size: file.size,
      createdAt: file.createdAt,
    },
  });
});

/**
 * List files
 * GET /files
 */
export const listFiles = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const type = req.query.type as MediaType;

  const where: any = {};
  if (type) {
    where.type = type;
  }

  const [files, total] = await fileRepository.findAndCount({
    where,
    order: { createdAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  });

  res.json({
    success: true,
    data: files.map((f) => ({
      id: f.id,
      originalName: f.originalName,
      url: f.path,
      mimeType: f.mimeType,
      size: f.size,
      createdAt: f.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Delete file
 * DELETE /files/:id
 */
export const deleteFile = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const file = await fileRepository.findOne({
    where: { id },
  });

  if (!file) {
    return res.status(404).json({
      success: false,
      message: 'File not found',
    });
  }

  // Extract key from URL for deletion
  const urlParts = file.path.split('/');
  const key = urlParts[urlParts.length - 1];

  // Delete from storage
  await deleteFromStorage(key);

  // Delete record
  await fileRepository.remove(file);

  res.json({
    success: true,
    message: 'File deleted successfully',
  });
});
