import { Response } from 'express';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../types';
import { AppDataSource } from '../config/database';
import { File, FileType } from '../entities/File.entity';
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
export const uploadImage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file provided',
    });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const fileName = `${uuidv4()}${ext}`;

  // Upload to storage (local or cloud)
  const filePath = await uploadToStorage(req.file.buffer, fileName, req.file.mimetype);

  // Save file record
  const file = fileRepository.create({
    fileName,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    path: filePath,
    type: FileType.IMAGE,
    businessId: req.businessId,
    uploadedById: req.userId,
  });

  await fileRepository.save(file);

  res.status(201).json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      id: file.id,
      fileName: file.fileName,
      url: `/assets/${file.fileName}`,
      mimeType: file.mimeType,
      size: file.size,
    },
  });
});

/**
 * Upload multiple images
 * POST /files/upload-multiple
 */
export const uploadMultiple = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

    const filePath = await uploadToStorage(file.buffer, fileName, file.mimetype);

    const fileRecord = fileRepository.create({
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: filePath,
      type: FileType.IMAGE,
      businessId: req.businessId,
      uploadedById: req.userId,
    });

    await fileRepository.save(fileRecord);

    uploadedFiles.push({
      id: fileRecord.id,
      fileName: fileRecord.fileName,
      url: `/assets/${fileRecord.fileName}`,
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
export const getFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const file = await fileRepository.findOne({
    where: { id, businessId: req.businessId },
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
      fileName: file.fileName,
      originalName: file.originalName,
      url: `/assets/${file.fileName}`,
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
export const listFiles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const type = req.query.type as FileType;

  const where: any = { businessId: req.businessId };
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
      fileName: f.fileName,
      originalName: f.originalName,
      url: `/assets/${f.fileName}`,
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
export const deleteFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const file = await fileRepository.findOne({
    where: { id, businessId: req.businessId },
  });

  if (!file) {
    return res.status(404).json({
      success: false,
      message: 'File not found',
    });
  }

  // Delete from storage
  await deleteFromStorage(file.path);

  // Delete record
  await fileRepository.remove(file);

  res.json({
    success: true,
    message: 'File deleted successfully',
  });
});

export default {
  upload,
  uploadImage,
  uploadMultiple,
  getFile,
  listFiles,
  deleteFile,
};
