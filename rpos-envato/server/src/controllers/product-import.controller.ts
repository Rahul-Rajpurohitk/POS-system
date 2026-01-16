import { Request, Response, NextFunction } from 'express';
import * as XLSX from 'xlsx';
import { productImportService, ImportRow } from '../services/product-import.service';
import { DuplicateAction } from '../entities';

// Helper to parse CSV/Excel content
function parseFileContent(
  buffer: Buffer,
  fileType: string
): { headers: string[]; rows: Record<string, string | number>[] } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Get headers
  const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, {
    header: 1,
    defval: '',
  });

  if (jsonData.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = (jsonData[0] as unknown as string[]).map((h) =>
    String(h).trim().toLowerCase()
  );
  const rows: Record<string, string | number>[] = [];

  for (let i = 1; i < jsonData.length; i++) {
    const rowData = jsonData[i] as unknown as (string | number)[];
    const row: Record<string, string | number> = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = rowData[j] ?? '';
    }

    // Skip empty rows
    if (Object.values(row).some((v) => v !== '')) {
      rows.push(row);
    }
  }

  return { headers, rows };
}

// Apply column mapping to rows
function applyMapping(
  rows: Record<string, string | number>[],
  mapping: Record<string, string>
): ImportRow[] {
  return rows.map((row, index) => {
    const mappedRow: ImportRow = { rowNumber: index + 2 }; // +2 because row 1 is headers

    for (const [sourceCol, targetField] of Object.entries(mapping)) {
      if (row[sourceCol] !== undefined) {
        (mappedRow as Record<string, string | number | undefined>)[targetField] = row[sourceCol];
      }
    }

    return mappedRow;
  });
}

/**
 * Download CSV template
 */
export const getTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = productImportService.generateTemplate();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="product_import_template.csv"');
    res.send(template);
  } catch (error) {
    next(error);
  }
};

/**
 * Validate import file
 */
export const validateImport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate file type
    const fileType = file.originalname.split('.').pop()?.toLowerCase();
    if (!fileType || !['csv', 'xlsx', 'xls'].includes(fileType)) {
      return res.status(400).json({ message: 'Invalid file type. Supported: CSV, XLSX' });
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ message: 'File size exceeds 10MB limit' });
    }

    // Parse file content
    const { headers, rows } = parseFileContent(file.buffer, fileType);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'File is empty or has no data rows' });
    }

    // Row limit check
    if (rows.length > 1000) {
      return res.status(400).json({
        message: 'File exceeds 1000 row limit',
        totalRows: rows.length,
      });
    }

    // Auto-map columns
    const columnMapping = productImportService.autoMapColumns(headers);

    // Apply mapping and validate
    const mappedRows = applyMapping(rows, columnMapping);
    const validationResult = await productImportService.validateRows(
      mappedRows,
      req.user!.businessId
    );

    res.json({
      fileName: file.originalname,
      fileType,
      fileSize: file.size,
      totalRows: rows.length,
      headers,
      columnMapping,
      suggestedMapping: columnMapping,
      validation: validationResult,
      sampleData: mappedRows.slice(0, 5), // First 5 rows for preview
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check for duplicates
 */
export const checkDuplicates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    const { columnMapping } = req.body;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Parse file
    const fileType = file.originalname.split('.').pop()?.toLowerCase() || 'csv';
    const { headers, rows } = parseFileContent(file.buffer, fileType);

    // Use provided mapping or auto-detect
    const mapping = columnMapping
      ? JSON.parse(columnMapping)
      : productImportService.autoMapColumns(headers);

    // Apply mapping
    const mappedRows = applyMapping(rows, mapping);

    // Check duplicates
    const duplicateResult = await productImportService.checkDuplicates(
      mappedRows,
      req.user!.businessId
    );

    res.json({
      totalRows: rows.length,
      duplicateCount: duplicateResult.duplicates.length,
      uniqueCount: duplicateResult.uniqueRows.length,
      duplicates: duplicateResult.duplicates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Execute import
 */
export const executeImport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    const {
      columnMapping,
      duplicateAction = 'skip',
    } = req.body;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate file type
    const fileType = file.originalname.split('.').pop()?.toLowerCase() || 'csv';
    if (!['csv', 'xlsx', 'xls'].includes(fileType)) {
      return res.status(400).json({ message: 'Invalid file type' });
    }

    // Parse file
    const { headers, rows } = parseFileContent(file.buffer, fileType);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'File has no data rows' });
    }

    if (rows.length > 1000) {
      return res.status(400).json({ message: 'File exceeds 1000 row limit' });
    }

    // Use provided mapping or auto-detect
    const mapping = columnMapping
      ? (typeof columnMapping === 'string' ? JSON.parse(columnMapping) : columnMapping)
      : productImportService.autoMapColumns(headers);

    // Apply mapping
    const mappedRows = applyMapping(rows, mapping);

    // Validate
    const validationResult = await productImportService.validateRows(
      mappedRows,
      req.user!.businessId
    );

    if (!validationResult.isValid) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      });
    }

    // Create import job
    const job = await productImportService.createJob(
      req.user!.businessId,
      req.user!.id,
      file.originalname,
      fileType,
      file.size,
      validationResult.validRows.length
    );

    // Update job with mapping
    job.columnMapping = mapping;
    job.duplicateAction = duplicateAction as DuplicateAction;
    job.warnings = validationResult.warnings;

    // Execute import
    const result = await productImportService.executeImport(
      job.id,
      validationResult.validRows,
      req.user!.businessId,
      { duplicateAction: duplicateAction as DuplicateAction }
    );

    res.json({
      jobId: result.id,
      status: result.status,
      summary: {
        totalRows: result.totalRows,
        created: result.createdCount,
        updated: result.updatedCount,
        skipped: result.skippedCount,
        failed: result.failedCount,
      },
      warnings: result.warnings,
      errors: result.errors,
      completedAt: result.completedAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get import job status
 */
export const getImportJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const job = await productImportService.getJob(id, req.user!.businessId);

    if (!job) {
      return res.status(404).json({ message: 'Import job not found' });
    }

    res.json(job);
  } catch (error) {
    next(error);
  }
};

/**
 * Rollback import
 */
export const rollbackImport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const job = await productImportService.getJob(id, req.user!.businessId);

    if (!job) {
      return res.status(404).json({ message: 'Import job not found' });
    }

    const result = await productImportService.rollbackImport(id);

    res.json({
      jobId: result.id,
      status: result.status,
      rolledBackProducts: result.createdProductIds?.length || 0,
      rollbackAt: result.rollbackAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get import history
 */
export const getImportHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await productImportService.getImportHistory(
      req.user!.businessId,
      page,
      limit
    );

    res.json({
      jobs: result.jobs,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error) {
    next(error);
  }
};
