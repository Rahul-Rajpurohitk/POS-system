import { AppDataSource } from '../config/database';
import { In, ILike } from 'typeorm';
import {
  Product,
  Category,
  ProductImportJob,
  ImportRowError,
  ImportRowResult,
  DuplicateAction,
} from '../entities';
import { barcodeService } from './barcode.service';

export interface ImportRow {
  rowNumber: number;
  name?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  categoryName?: string;
  brand?: string;
  sellingPrice?: string | number;
  purchasePrice?: string | number;
  quantity?: string | number;
  taxClass?: string;
  unitOfMeasure?: string;
  weight?: string | number;
  weightUnit?: string;
  tags?: string;
  [key: string]: string | number | undefined;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ImportRowError[];
  warnings: ImportRowError[];
  validRows: ImportRow[];
  totalRows: number;
}

export interface DuplicateCheckResult {
  duplicates: Array<{
    row: number;
    matchField: 'sku' | 'barcode' | 'name';
    matchValue: string;
    existingProduct: {
      id: string;
      name: string;
      sku: string;
    };
  }>;
  uniqueRows: ImportRow[];
}

export interface ImportOptions {
  duplicateAction: DuplicateAction;
  skipValidation?: boolean;
  dryRun?: boolean;
}

const REQUIRED_FIELDS = ['name'];
const NUMERIC_FIELDS = ['sellingPrice', 'purchasePrice', 'quantity', 'weight'];
const PRICE_FIELDS = ['sellingPrice', 'purchasePrice'];

// Standard column names that we'll auto-map
const COLUMN_ALIASES: Record<string, string[]> = {
  name: ['name', 'product name', 'productname', 'title', 'product title', 'item name'],
  sku: ['sku', 'stock keeping unit', 'item code', 'product code', 'code'],
  barcode: ['barcode', 'upc', 'ean', 'gtin', 'primary barcode'],
  description: ['description', 'desc', 'details', 'product description'],
  categoryName: ['category', 'category name', 'categoryname', 'product category'],
  brand: ['brand', 'manufacturer', 'vendor', 'brand name'],
  sellingPrice: ['selling price', 'sellingprice', 'price', 'retail price', 'sale price', 'unit price'],
  purchasePrice: ['purchase price', 'purchaseprice', 'cost', 'cost price', 'unit cost', 'buy price'],
  quantity: ['quantity', 'qty', 'stock', 'stock quantity', 'inventory', 'on hand'],
  taxClass: ['tax class', 'taxclass', 'tax', 'tax rate'],
  unitOfMeasure: ['unit', 'uom', 'unit of measure', 'unit type'],
  weight: ['weight', 'gross weight', 'net weight'],
  weightUnit: ['weight unit', 'weightunit', 'wt unit'],
  tags: ['tags', 'labels', 'keywords'],
};

class ProductImportService {
  private productRepo = AppDataSource.getRepository(Product);
  private categoryRepo = AppDataSource.getRepository(Category);
  private importJobRepo = AppDataSource.getRepository(ProductImportJob);

  /**
   * Auto-map CSV/Excel columns to product fields
   */
  autoMapColumns(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();

      for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
        if (aliases.includes(normalizedHeader)) {
          mapping[header] = field;
          break;
        }
      }
    }

    return mapping;
  }

  /**
   * Validate import rows
   */
  async validateRows(
    rows: ImportRow[],
    businessId: string
  ): Promise<ValidationResult> {
    const errors: ImportRowError[] = [];
    const warnings: ImportRowError[] = [];
    const validRows: ImportRow[] = [];

    for (const row of rows) {
      let rowValid = true;

      // Check required fields
      for (const field of REQUIRED_FIELDS) {
        if (!row[field] || String(row[field]).trim() === '') {
          errors.push({
            row: row.rowNumber,
            field,
            message: `${field} is required`,
            value: String(row[field] || ''),
          });
          rowValid = false;
        }
      }

      // Validate name length
      if (row.name && String(row.name).trim().length < 2) {
        errors.push({
          row: row.rowNumber,
          field: 'name',
          message: 'Name must be at least 2 characters',
          value: String(row.name),
        });
        rowValid = false;
      }

      // Validate numeric fields
      for (const field of NUMERIC_FIELDS) {
        if (row[field] !== undefined && row[field] !== '' && row[field] !== null) {
          const value = parseFloat(String(row[field]));
          if (isNaN(value)) {
            errors.push({
              row: row.rowNumber,
              field,
              message: `${field} must be a valid number`,
              value: String(row[field]),
            });
            rowValid = false;
          } else if (value < 0 && PRICE_FIELDS.includes(field)) {
            errors.push({
              row: row.rowNumber,
              field,
              message: `${field} cannot be negative`,
              value: String(row[field]),
            });
            rowValid = false;
          }
        }
      }

      // Check for selling price
      if (!row.sellingPrice || parseFloat(String(row.sellingPrice)) <= 0) {
        errors.push({
          row: row.rowNumber,
          field: 'sellingPrice',
          message: 'Selling price is required and must be positive',
          value: String(row.sellingPrice || ''),
        });
        rowValid = false;
      }

      // Warning: negative margin
      const sellingPrice = parseFloat(String(row.sellingPrice || 0));
      const purchasePrice = parseFloat(String(row.purchasePrice || 0));
      if (sellingPrice > 0 && purchasePrice > 0 && purchasePrice > sellingPrice) {
        warnings.push({
          row: row.rowNumber,
          field: 'purchasePrice',
          message: 'Purchase price is higher than selling price (negative margin)',
          value: `Cost: ${purchasePrice}, Price: ${sellingPrice}`,
        });
      }

      if (rowValid) {
        validRows.push(row);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validRows,
      totalRows: rows.length,
    };
  }

  /**
   * Check for duplicate products
   */
  async checkDuplicates(
    rows: ImportRow[],
    businessId: string
  ): Promise<DuplicateCheckResult> {
    const duplicates: DuplicateCheckResult['duplicates'] = [];
    const uniqueRows: ImportRow[] = [];

    // Collect all SKUs and barcodes to check
    const skus = rows.filter(r => r.sku).map(r => String(r.sku).trim());
    const barcodes = rows.filter(r => r.barcode).map(r => String(r.barcode).trim());
    const names = rows.map(r => String(r.name || '').trim().toLowerCase());

    // Find existing products by SKU
    const existingBySku = skus.length > 0
      ? await this.productRepo.find({
          where: { businessId, sku: In(skus) },
          select: ['id', 'name', 'sku'],
        })
      : [];

    // Find existing products by barcode
    const existingByBarcode = barcodes.length > 0
      ? await this.productRepo.find({
          where: { businessId, primaryBarcode: In(barcodes) },
          select: ['id', 'name', 'sku', 'primaryBarcode'],
        })
      : [];

    const skuMap = new Map(existingBySku.map(p => [p.sku.toLowerCase(), p]));
    const barcodeMap = new Map(existingByBarcode.map(p => [p.primaryBarcode?.toLowerCase(), p]));

    for (const row of rows) {
      let isDuplicate = false;

      // Check SKU
      if (row.sku) {
        const existing = skuMap.get(String(row.sku).trim().toLowerCase());
        if (existing) {
          duplicates.push({
            row: row.rowNumber,
            matchField: 'sku',
            matchValue: String(row.sku),
            existingProduct: {
              id: existing.id,
              name: existing.name,
              sku: existing.sku,
            },
          });
          isDuplicate = true;
        }
      }

      // Check barcode
      if (row.barcode && !isDuplicate) {
        const existing = barcodeMap.get(String(row.barcode).trim().toLowerCase());
        if (existing) {
          duplicates.push({
            row: row.rowNumber,
            matchField: 'barcode',
            matchValue: String(row.barcode),
            existingProduct: {
              id: existing.id,
              name: existing.name,
              sku: existing.sku,
            },
          });
          isDuplicate = true;
        }
      }

      if (!isDuplicate) {
        uniqueRows.push(row);
      }
    }

    return { duplicates, uniqueRows };
  }

  /**
   * Get or create category by name
   */
  async getOrCreateCategory(name: string, businessId: string): Promise<string | undefined> {
    if (!name || name.trim() === '') return undefined;

    const normalizedName = name.trim();

    // Try to find existing category
    let category = await this.categoryRepo.findOne({
      where: {
        businessId,
        name: ILike(normalizedName),
      },
    });

    if (!category) {
      // Create new category
      category = this.categoryRepo.create({
        businessId,
        name: normalizedName,
        code: normalizedName.toLowerCase().replace(/\s+/g, '-'),
      });
      await this.categoryRepo.save(category);
    }

    return category.id;
  }

  /**
   * Execute import
   */
  async executeImport(
    jobId: string,
    rows: ImportRow[],
    businessId: string,
    options: ImportOptions
  ): Promise<ProductImportJob> {
    const job = await this.importJobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new Error('Import job not found');
    }

    // Update job status
    job.status = 'processing';
    job.startedAt = new Date();
    await this.importJobRepo.save(job);

    const results: ImportRowResult[] = [];
    const createdProductIds: string[] = [];

    try {
      for (const row of rows) {
        try {
          // Parse values
          const sellingPrice = parseFloat(String(row.sellingPrice || 0));
          const purchasePrice = parseFloat(String(row.purchasePrice || 0));
          const quantity = parseInt(String(row.quantity || 0), 10) || 0;
          const weight = row.weight ? parseFloat(String(row.weight)) : undefined;

          // Get category ID
          const categoryId = row.categoryName
            ? await this.getOrCreateCategory(String(row.categoryName), businessId)
            : undefined;

          // Check for existing product
          let existingProduct: Product | null = null;

          if (row.sku) {
            existingProduct = await this.productRepo.findOne({
              where: { businessId, sku: String(row.sku).trim() },
            });
          }

          if (!existingProduct && row.barcode) {
            existingProduct = await this.productRepo.findOne({
              where: { businessId, primaryBarcode: String(row.barcode).trim() },
            });
          }

          if (existingProduct) {
            // Handle duplicate based on action
            if (options.duplicateAction === 'skip') {
              results.push({
                row: row.rowNumber,
                status: 'skipped',
                productId: existingProduct.id,
                sku: existingProduct.sku,
                name: existingProduct.name,
              });
              job.skippedCount++;
              continue;
            } else if (options.duplicateAction === 'update') {
              // Update existing product
              existingProduct.name = String(row.name).trim();
              existingProduct.description = row.description ? String(row.description).trim() : existingProduct.description;
              existingProduct.sellingPrice = sellingPrice;
              existingProduct.purchasePrice = purchasePrice;
              existingProduct.quantity = quantity || existingProduct.quantity;
              existingProduct.brand = row.brand ? String(row.brand).trim() : existingProduct.brand;
              existingProduct.taxClass = row.taxClass ? String(row.taxClass).trim() : existingProduct.taxClass;
              existingProduct.unitOfMeasure = row.unitOfMeasure ? String(row.unitOfMeasure).trim() : existingProduct.unitOfMeasure;
              existingProduct.weight = weight ?? existingProduct.weight;
              existingProduct.weightUnit = row.weightUnit ? String(row.weightUnit).trim() : existingProduct.weightUnit;
              if (categoryId) existingProduct.categoryId = categoryId;
              if (row.tags) {
                existingProduct.tags = String(row.tags).split(',').map(t => t.trim()).filter(Boolean);
              }

              await this.productRepo.save(existingProduct);

              results.push({
                row: row.rowNumber,
                status: 'updated',
                productId: existingProduct.id,
                sku: existingProduct.sku,
                name: existingProduct.name,
              });
              job.updatedCount++;
              continue;
            }
            // 'create_new' falls through to create new product with modified SKU
          }

          // Generate SKU if not provided or if creating new from duplicate
          let sku = row.sku ? String(row.sku).trim() : '';
          if (!sku || (existingProduct && options.duplicateAction === 'create_new')) {
            sku = await barcodeService.generateSKU(businessId, categoryId);
          }

          // Create new product
          const newProduct = this.productRepo.create({
            businessId,
            name: String(row.name).trim(),
            sku,
            primaryBarcode: row.barcode ? String(row.barcode).trim() : null,
            description: row.description ? String(row.description).trim() : '',
            sellingPrice,
            purchasePrice,
            quantity,
            brand: row.brand ? String(row.brand).trim() : null,
            taxClass: row.taxClass ? String(row.taxClass).trim() : 'standard',
            unitOfMeasure: row.unitOfMeasure ? String(row.unitOfMeasure).trim() : 'each',
            weight: weight ?? null,
            weightUnit: row.weightUnit ? String(row.weightUnit).trim() : 'kg',
            categoryId,
            tags: row.tags ? String(row.tags).split(',').map(t => t.trim()).filter(Boolean) : [],
            images: [],
          });

          await this.productRepo.save(newProduct);
          createdProductIds.push(newProduct.id);

          results.push({
            row: row.rowNumber,
            status: 'created',
            productId: newProduct.id,
            sku: newProduct.sku,
            name: newProduct.name,
          });
          job.createdCount++;
        } catch (rowError) {
          results.push({
            row: row.rowNumber,
            status: 'failed',
            error: rowError instanceof Error ? rowError.message : 'Unknown error',
          });
          job.failedCount++;
        }

        job.processedRows++;
        await this.importJobRepo.save(job);
      }

      // Update job completion
      job.status = 'completed';
      job.completedAt = new Date();
      job.results = results;
      job.createdProductIds = createdProductIds;
      await this.importJobRepo.save(job);

      return job;
    } catch (error) {
      // Update job failure
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Import failed';
      job.completedAt = new Date();
      job.results = results;
      job.createdProductIds = createdProductIds;
      await this.importJobRepo.save(job);

      throw error;
    }
  }

  /**
   * Rollback an import job
   */
  async rollbackImport(jobId: string): Promise<ProductImportJob> {
    const job = await this.importJobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new Error('Import job not found');
    }

    if (job.status !== 'completed') {
      throw new Error('Can only rollback completed imports');
    }

    // Check rollback time limit (24 hours)
    const hoursSinceCompletion = job.completedAt
      ? (Date.now() - job.completedAt.getTime()) / (1000 * 60 * 60)
      : 0;

    if (hoursSinceCompletion > 24) {
      throw new Error('Rollback window has expired (24 hours)');
    }

    // Delete created products
    if (job.createdProductIds && job.createdProductIds.length > 0) {
      await this.productRepo.delete({
        id: In(job.createdProductIds),
        businessId: job.businessId,
      });
    }

    // Update job status
    job.status = 'rolled_back';
    job.rollbackAt = new Date();
    await this.importJobRepo.save(job);

    return job;
  }

  /**
   * Create import job record
   */
  async createJob(
    businessId: string,
    userId: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    totalRows: number
  ): Promise<ProductImportJob> {
    const job = this.importJobRepo.create({
      businessId,
      createdById: userId,
      fileName,
      fileType,
      fileSize,
      totalRows,
      status: 'pending',
    });

    await this.importJobRepo.save(job);
    return job;
  }

  /**
   * Get import job by ID
   */
  async getJob(jobId: string, businessId: string): Promise<ProductImportJob | null> {
    return this.importJobRepo.findOne({
      where: { id: jobId, businessId },
      relations: ['createdBy'],
    });
  }

  /**
   * Get import history for a business
   */
  async getImportHistory(
    businessId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ jobs: ProductImportJob[]; total: number }> {
    const [jobs, total] = await this.importJobRepo.findAndCount({
      where: { businessId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { jobs, total };
  }

  /**
   * Generate CSV template
   */
  generateTemplate(): string {
    const headers = [
      'name',
      'sku',
      'barcode',
      'description',
      'category',
      'brand',
      'selling_price',
      'purchase_price',
      'quantity',
      'tax_class',
      'unit',
      'weight',
      'weight_unit',
      'tags',
    ];

    const sampleRow = [
      'Sample Product',
      'SKU-001',
      '1234567890123',
      'Product description',
      'Electronics',
      'BrandName',
      '29.99',
      '19.99',
      '100',
      'standard',
      'each',
      '0.5',
      'lb',
      'sale,featured',
    ];

    return headers.join(',') + '\n' + sampleRow.join(',');
  }
}

export const productImportService = new ProductImportService();
