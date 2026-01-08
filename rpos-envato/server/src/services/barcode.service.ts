import { EntityManager, Repository, LessThan, In } from 'typeorm';
import { AppDataSource } from '../config/database';
import {
  ProductBarcode,
  SKUConfiguration,
  ProductBatch,
  BarcodeScanLog,
  BarcodeType,
  BarcodeStatus,
  BatchStatus,
  ScanType,
  SKUFormat,
} from '../entities/Barcode.entity';
import { Product } from '../entities/Product.entity';
import { Category } from '../entities/Category.entity';

// DTOs
export interface CreateBarcodeDTO {
  businessId: string;
  productId: string;
  barcode: string;
  type?: BarcodeType;
  isPrimary?: boolean;
  variantName?: string;
  variantSku?: string;
  unitQuantity?: number;
  priceOverride?: number;
  costOverride?: number;
  manufacturer?: string;
  manufacturerPartNumber?: string;
}

export interface CreateBatchDTO {
  businessId: string;
  productId: string;
  batchNumber: string;
  lotNumber?: string;
  manufactureDate?: Date;
  expirationDate?: Date;
  receivedDate: Date;
  initialQuantity: number;
  unitCost?: number;
  supplierId?: string;
  purchaseOrderId?: string;
  locationId?: string;
  storageLocation?: string;
  notes?: string;
}

export interface ScanResult {
  matched: boolean;
  barcode: string;
  type: BarcodeType | null;
  product: Product | null;
  productBarcode: ProductBarcode | null;
  batches: ProductBatch[];
  suggestedAction?: string;
}

class BarcodeService {
  private barcodeRepository: Repository<ProductBarcode>;
  private skuConfigRepository: Repository<SKUConfiguration>;
  private batchRepository: Repository<ProductBatch>;
  private scanLogRepository: Repository<BarcodeScanLog>;
  private productRepository: Repository<Product>;

  constructor() {
    this.barcodeRepository = AppDataSource.getRepository(ProductBarcode);
    this.skuConfigRepository = AppDataSource.getRepository(SKUConfiguration);
    this.batchRepository = AppDataSource.getRepository(ProductBatch);
    this.scanLogRepository = AppDataSource.getRepository(BarcodeScanLog);
    this.productRepository = AppDataSource.getRepository(Product);
  }

  // ============ BARCODE VALIDATION ============

  validateBarcode(barcode: string, type?: BarcodeType): { valid: boolean; type: BarcodeType | null; error?: string } {
    // Auto-detect type if not provided
    if (!type) {
      type = this.detectBarcodeType(barcode);
    }

    if (!type) {
      return { valid: false, type: null, error: 'Unable to detect barcode type' };
    }

    let valid = false;
    let error: string | undefined;

    switch (type) {
      case BarcodeType.UPC_A:
        valid = this.validateUPCA(barcode);
        error = valid ? undefined : 'Invalid UPC-A: must be 12 digits with valid check digit';
        break;

      case BarcodeType.UPC_E:
        valid = this.validateUPCE(barcode);
        error = valid ? undefined : 'Invalid UPC-E: must be 8 digits with valid check digit';
        break;

      case BarcodeType.EAN_13:
        valid = this.validateEAN13(barcode);
        error = valid ? undefined : 'Invalid EAN-13: must be 13 digits with valid check digit';
        break;

      case BarcodeType.EAN_8:
        valid = this.validateEAN8(barcode);
        error = valid ? undefined : 'Invalid EAN-8: must be 8 digits with valid check digit';
        break;

      case BarcodeType.CODE_39:
        valid = /^[A-Z0-9\-. $/+%*]+$/.test(barcode);
        error = valid ? undefined : 'Invalid Code 39: only alphanumeric and special chars allowed';
        break;

      case BarcodeType.CODE_128:
        valid = barcode.length > 0 && barcode.length <= 80;
        error = valid ? undefined : 'Invalid Code 128: must be 1-80 characters';
        break;

      case BarcodeType.ITF_14:
        valid = this.validateITF14(barcode);
        error = valid ? undefined : 'Invalid ITF-14: must be 14 digits with valid check digit';
        break;

      case BarcodeType.QR_CODE:
      case BarcodeType.DATA_MATRIX:
      case BarcodeType.PDF_417:
        valid = barcode.length > 0;
        error = valid ? undefined : 'Barcode cannot be empty';
        break;

      case BarcodeType.INTERNAL:
      case BarcodeType.CUSTOM:
        valid = barcode.length > 0 && barcode.length <= 100;
        error = valid ? undefined : 'Barcode must be 1-100 characters';
        break;

      default:
        valid = false;
        error = 'Unknown barcode type';
    }

    return { valid, type, error };
  }

  private detectBarcodeType(barcode: string): BarcodeType | null {
    // Remove any whitespace
    barcode = barcode.trim();

    // Check for numeric-only formats
    if (/^\d+$/.test(barcode)) {
      switch (barcode.length) {
        case 8:
          // Could be UPC-E or EAN-8
          return BarcodeType.EAN_8;
        case 12:
          return BarcodeType.UPC_A;
        case 13:
          return BarcodeType.EAN_13;
        case 14:
          return BarcodeType.ITF_14;
      }
    }

    // Check for Code 39 pattern
    if (/^[A-Z0-9\-. $/+%*]+$/.test(barcode) && barcode.length <= 43) {
      return BarcodeType.CODE_39;
    }

    // Default to internal/custom
    return BarcodeType.INTERNAL;
  }

  private validateUPCA(barcode: string): boolean {
    if (!/^\d{12}$/.test(barcode)) return false;
    return this.validateCheckDigit(barcode, 12);
  }

  private validateUPCE(barcode: string): boolean {
    if (!/^\d{8}$/.test(barcode)) return false;
    return this.validateCheckDigit(barcode, 8);
  }

  private validateEAN13(barcode: string): boolean {
    if (!/^\d{13}$/.test(barcode)) return false;
    return this.validateCheckDigit(barcode, 13);
  }

  private validateEAN8(barcode: string): boolean {
    if (!/^\d{8}$/.test(barcode)) return false;
    return this.validateCheckDigit(barcode, 8);
  }

  private validateITF14(barcode: string): boolean {
    if (!/^\d{14}$/.test(barcode)) return false;
    return this.validateCheckDigit(barcode, 14);
  }

  private validateCheckDigit(barcode: string, length: number): boolean {
    const digits = barcode.split('').map(Number);
    const checkDigit = digits[length - 1];

    let sum = 0;
    for (let i = 0; i < length - 1; i++) {
      const multiplier = (length - 1 - i) % 2 === 0 ? 1 : 3;
      sum += digits[i] * multiplier;
    }

    const calculatedCheck = (10 - (sum % 10)) % 10;
    return calculatedCheck === checkDigit;
  }

  generateCheckDigit(barcode: string): string {
    const digits = barcode.split('').map(Number);
    let sum = 0;

    for (let i = 0; i < digits.length; i++) {
      const multiplier = (digits.length - i) % 2 === 0 ? 1 : 3;
      sum += digits[i] * multiplier;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return barcode + checkDigit;
  }

  // ============ SKU GENERATION ============

  async getSKUConfiguration(businessId: string): Promise<SKUConfiguration> {
    let config = await this.skuConfigRepository.findOne({ where: { businessId } });

    if (!config) {
      config = this.skuConfigRepository.create({
        businessId,
        format: SKUFormat.SEQUENTIAL,
        nextSequence: 1,
        sequencePadding: 5,
      });
      await this.skuConfigRepository.save(config);
    }

    return config;
  }

  async updateSKUConfiguration(
    businessId: string,
    updates: Partial<Omit<SKUConfiguration, 'id' | 'businessId' | 'updatedAt'>>
  ): Promise<SKUConfiguration> {
    const config = await this.getSKUConfiguration(businessId);
    Object.assign(config, updates);
    return this.skuConfigRepository.save(config);
  }

  async generateSKU(businessId: string, categoryId?: string): Promise<string> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const config = await manager
        .getRepository(SKUConfiguration)
        .createQueryBuilder('config')
        .setLock('pessimistic_write')
        .where('config.businessId = :businessId', { businessId })
        .getOne();

      if (!config) {
        // Create default config
        const newConfig = manager.create(SKUConfiguration, {
          businessId,
          format: SKUFormat.SEQUENTIAL,
          nextSequence: 1,
          sequencePadding: 5,
        });
        await manager.save(newConfig);
        return this.buildSKU(newConfig, null);
      }

      let categoryCode: string | null = null;
      if (config.format === SKUFormat.CATEGORY_PREFIX && categoryId) {
        const category = await manager.findOne(Category, { where: { id: categoryId } });
        if (category) {
          categoryCode = category.name.substring(0, config.categoryCodeLength).toUpperCase().replace(/[^A-Z0-9]/g, '');
        }
      }

      const sku = this.buildSKU(config, categoryCode);

      // Increment sequence
      config.nextSequence += 1;
      await manager.save(config);

      return sku;
    });
  }

  private buildSKU(config: SKUConfiguration, categoryCode: string | null): string {
    let sku = '';

    switch (config.format) {
      case SKUFormat.SEQUENTIAL:
        sku = String(config.nextSequence).padStart(config.sequencePadding, '0');
        break;

      case SKUFormat.CATEGORY_PREFIX:
        const catCode = categoryCode || 'GEN';
        sku = `${catCode}-${String(config.nextSequence).padStart(config.sequencePadding, '0')}`;
        break;

      case SKUFormat.CUSTOM_PATTERN:
        if (config.customPattern) {
          sku = config.customPattern
            .replace('{SEQ}', String(config.nextSequence))
            .replace(/\{SEQ:(\d+)\}/g, (_, pad) => String(config.nextSequence).padStart(parseInt(pad), '0'))
            .replace('{YEAR}', String(new Date().getFullYear()))
            .replace('{MONTH}', String(new Date().getMonth() + 1).padStart(2, '0'))
            .replace('{CAT}', categoryCode || 'GEN');
        } else {
          sku = String(config.nextSequence).padStart(config.sequencePadding, '0');
        }
        break;
    }

    if (config.prefix) {
      sku = config.prefix + sku;
    }
    if (config.suffix) {
      sku = sku + config.suffix;
    }

    return sku;
  }

  async validateSKU(businessId: string, sku: string, excludeProductId?: string): Promise<{ valid: boolean; error?: string }> {
    const query: any = { businessId, sku };

    if (excludeProductId) {
      const existing = await this.productRepository.findOne({
        where: { businessId, sku },
      });

      if (existing && existing.id !== excludeProductId) {
        return { valid: false, error: 'SKU already in use' };
      }
    } else {
      const existing = await this.productRepository.findOne({ where: query });
      if (existing) {
        return { valid: false, error: 'SKU already in use' };
      }
    }

    return { valid: true };
  }

  // ============ BARCODE CRUD ============

  async createBarcode(dto: CreateBarcodeDTO): Promise<ProductBarcode> {
    // Validate barcode
    const validation = this.validateBarcode(dto.barcode, dto.type);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check for duplicate
    const existing = await this.barcodeRepository.findOne({
      where: { businessId: dto.businessId, barcode: dto.barcode },
    });

    if (existing) {
      throw new Error('Barcode already exists');
    }

    return AppDataSource.transaction(async (manager: EntityManager) => {
      // If setting as primary, unset other primaries for this product
      if (dto.isPrimary) {
        await manager.update(
          ProductBarcode,
          { productId: dto.productId, isPrimary: true },
          { isPrimary: false }
        );
      }

      const barcode = manager.create(ProductBarcode, {
        ...dto,
        type: validation.type!,
        status: BarcodeStatus.ACTIVE,
      });

      return manager.save(barcode);
    });
  }

  async getProductBarcodes(productId: string): Promise<ProductBarcode[]> {
    return this.barcodeRepository.find({
      where: { productId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  async deleteBarcode(barcodeId: string, businessId: string): Promise<void> {
    await this.barcodeRepository.delete({ id: barcodeId, businessId });
  }

  // ============ PRODUCT LOOKUP ============

  async lookupByBarcode(
    businessId: string,
    barcode: string,
    options?: { scanType?: ScanType; scannedBy?: string; locationId?: string; ipAddress?: string }
  ): Promise<ScanResult> {
    const cleanBarcode = barcode.trim();
    const detectedType = this.detectBarcodeType(cleanBarcode);

    // First check product_barcodes table
    let productBarcode = await this.barcodeRepository.findOne({
      where: { businessId, barcode: cleanBarcode, status: BarcodeStatus.ACTIVE },
      relations: ['product'],
    });

    let product: Product | null = null;
    let batches: ProductBatch[] = [];

    if (productBarcode) {
      product = productBarcode.product;
    } else {
      // Check SKU directly on products
      product = await this.productRepository.findOne({
        where: { businessId, sku: cleanBarcode },
      });
    }

    if (product) {
      // Get available batches
      batches = await this.batchRepository.find({
        where: {
          productId: product.id,
          status: In([BatchStatus.AVAILABLE, BatchStatus.LOW_STOCK]),
        },
        order: { expirationDate: 'ASC' }, // FEFO - First Expire, First Out
      });
    }

    // Log the scan
    const scanLog = this.scanLogRepository.create({
      businessId,
      barcodeScanned: cleanBarcode,
      barcodeType: detectedType,
      scanType: options?.scanType || ScanType.LOOKUP,
      matched: !!product,
      productId: product?.id || null,
      productBarcodeId: productBarcode?.id || null,
      scannedBy: options?.scannedBy || null,
      locationId: options?.locationId || null,
      ipAddress: options?.ipAddress || null,
    });

    await this.scanLogRepository.save(scanLog);

    return {
      matched: !!product,
      barcode: cleanBarcode,
      type: detectedType,
      product,
      productBarcode,
      batches,
      suggestedAction: product ? undefined : 'Product not found. Create new product?',
    };
  }

  async bulkLookup(businessId: string, barcodes: string[]): Promise<Map<string, ScanResult>> {
    const results = new Map<string, ScanResult>();

    for (const barcode of barcodes) {
      const result = await this.lookupByBarcode(businessId, barcode);
      results.set(barcode, result);
    }

    return results;
  }

  // ============ BATCH MANAGEMENT ============

  async createBatch(dto: CreateBatchDTO): Promise<ProductBatch> {
    // Check for duplicate batch number
    const existing = await this.batchRepository.findOne({
      where: { businessId: dto.businessId, batchNumber: dto.batchNumber },
    });

    if (existing) {
      throw new Error('Batch number already exists');
    }

    const batch = this.batchRepository.create({
      ...dto,
      currentQuantity: dto.initialQuantity,
      status: BatchStatus.AVAILABLE,
    });

    return this.batchRepository.save(batch);
  }

  async updateBatchQuantity(
    batchId: string,
    businessId: string,
    quantityChange: number,
    reason?: string
  ): Promise<ProductBatch> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const batch = await manager
        .getRepository(ProductBatch)
        .createQueryBuilder('batch')
        .setLock('pessimistic_write')
        .where('batch.id = :id', { id: batchId })
        .andWhere('batch.businessId = :businessId', { businessId })
        .getOne();

      if (!batch) {
        throw new Error('Batch not found');
      }

      const newQuantity = batch.currentQuantity + quantityChange;

      if (newQuantity < 0) {
        throw new Error('Insufficient batch quantity');
      }

      batch.currentQuantity = newQuantity;

      // Update status
      if (newQuantity === 0) {
        batch.status = BatchStatus.DEPLETED;
      } else if (batch.isExpired) {
        batch.status = BatchStatus.EXPIRED;
      } else {
        batch.status = BatchStatus.AVAILABLE;
      }

      return manager.save(batch);
    });
  }

  async getProductBatches(
    productId: string,
    options?: { includeExpired?: boolean; includeDepleted?: boolean; locationId?: string }
  ): Promise<ProductBatch[]> {
    const where: any = { productId };

    if (!options?.includeExpired && !options?.includeDepleted) {
      where.status = In([BatchStatus.AVAILABLE, BatchStatus.LOW_STOCK]);
    } else if (!options?.includeExpired) {
      where.status = In([BatchStatus.AVAILABLE, BatchStatus.LOW_STOCK, BatchStatus.DEPLETED]);
    } else if (!options?.includeDepleted) {
      where.status = In([BatchStatus.AVAILABLE, BatchStatus.LOW_STOCK, BatchStatus.EXPIRED]);
    }

    if (options?.locationId) {
      where.locationId = options.locationId;
    }

    return this.batchRepository.find({
      where,
      order: { expirationDate: 'ASC', receivedDate: 'ASC' }, // FEFO
    });
  }

  async getExpiringBatches(
    businessId: string,
    daysAhead: number = 30
  ): Promise<ProductBatch[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.batchRepository.find({
      where: {
        businessId,
        status: In([BatchStatus.AVAILABLE, BatchStatus.LOW_STOCK]),
        expirationDate: LessThan(futureDate),
      },
      relations: ['product'],
      order: { expirationDate: 'ASC' },
    });
  }

  async expireBatches(): Promise<number> {
    const now = new Date();

    const expired = await this.batchRepository.find({
      where: {
        status: In([BatchStatus.AVAILABLE, BatchStatus.LOW_STOCK]),
        expirationDate: LessThan(now),
      },
    });

    for (const batch of expired) {
      batch.status = BatchStatus.EXPIRED;
      await this.batchRepository.save(batch);
    }

    return expired.length;
  }

  async allocateFromBatches(
    productId: string,
    quantity: number,
    options?: { locationId?: string; preferNearExpiry?: boolean }
  ): Promise<Array<{ batch: ProductBatch; quantity: number }>> {
    const batches = await this.getProductBatches(productId, {
      locationId: options?.locationId,
    });

    // Sort by expiration date (FEFO - First Expire, First Out)
    if (options?.preferNearExpiry !== false) {
      batches.sort((a, b) => {
        if (!a.expirationDate) return 1;
        if (!b.expirationDate) return -1;
        return a.expirationDate.getTime() - b.expirationDate.getTime();
      });
    }

    const allocations: Array<{ batch: ProductBatch; quantity: number }> = [];
    let remaining = quantity;

    for (const batch of batches) {
      if (remaining <= 0) break;

      const available = batch.availableQuantity;
      if (available <= 0) continue;

      const toAllocate = Math.min(available, remaining);
      allocations.push({ batch, quantity: toAllocate });
      remaining -= toAllocate;
    }

    if (remaining > 0) {
      throw new Error(`Insufficient batch quantity. Short by ${remaining} units.`);
    }

    return allocations;
  }

  // ============ SCAN ANALYTICS ============

  async getScanStatistics(
    businessId: string,
    options?: { startDate?: Date; endDate?: Date; locationId?: string }
  ): Promise<{
    totalScans: number;
    matchedScans: number;
    unmatchedScans: number;
    scansByType: Record<ScanType, number>;
    topProducts: Array<{ productId: string; count: number }>;
    unmatchedBarcodes: Array<{ barcode: string; count: number }>;
  }> {
    const qb = this.scanLogRepository
      .createQueryBuilder('log')
      .where('log.businessId = :businessId', { businessId });

    if (options?.startDate) {
      qb.andWhere('log.scannedAt >= :startDate', { startDate: options.startDate });
    }
    if (options?.endDate) {
      qb.andWhere('log.scannedAt <= :endDate', { endDate: options.endDate });
    }
    if (options?.locationId) {
      qb.andWhere('log.locationId = :locationId', { locationId: options.locationId });
    }

    // Get total counts
    const [totalScans, matchedScans] = await Promise.all([
      qb.clone().getCount(),
      qb.clone().andWhere('log.matched = true').getCount(),
    ]);

    // Get scans by type
    const typeResults = await qb
      .clone()
      .select('log.scanType', 'scanType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.scanType')
      .getRawMany();

    const scansByType = {} as Record<ScanType, number>;
    for (const result of typeResults) {
      scansByType[result.scanType as ScanType] = parseInt(result.count);
    }

    // Get top products
    const topProductsRaw = await qb
      .clone()
      .select('log.productId', 'productId')
      .addSelect('COUNT(*)', 'count')
      .andWhere('log.productId IS NOT NULL')
      .groupBy('log.productId')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const topProducts = topProductsRaw.map((r) => ({
      productId: r.productId,
      count: parseInt(r.count),
    }));

    // Get unmatched barcodes
    const unmatchedRaw = await qb
      .clone()
      .select('log.barcodeScanned', 'barcode')
      .addSelect('COUNT(*)', 'count')
      .andWhere('log.matched = false')
      .groupBy('log.barcodeScanned')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const unmatchedBarcodes = unmatchedRaw.map((r) => ({
      barcode: r.barcode,
      count: parseInt(r.count),
    }));

    return {
      totalScans,
      matchedScans,
      unmatchedScans: totalScans - matchedScans,
      scansByType,
      topProducts,
      unmatchedBarcodes,
    };
  }

  // ============ INTERNAL BARCODE GENERATION ============

  async generateInternalBarcode(businessId: string, productId: string): Promise<string> {
    // Generate a unique internal barcode
    // Format: 2XXXXXXXXXX (starts with 2 to indicate in-store)
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const baseCode = `2${timestamp}${random}`;

    // Add check digit
    return this.generateCheckDigit(baseCode);
  }

  async generateBarcodeImage(
    barcode: string,
    type: BarcodeType,
    options?: { width?: number; height?: number; format?: 'svg' | 'png' }
  ): Promise<{ data: string; mimeType: string }> {
    const width = options?.width || 200;
    const height = options?.height || 80;

    let svg: string;

    switch (type) {
      case BarcodeType.UPC_A:
      case BarcodeType.EAN_13:
        svg = this.generateEAN13SVG(barcode, width, height);
        break;
      case BarcodeType.CODE_128:
        svg = this.generateCode128SVG(barcode, width, height);
        break;
      case BarcodeType.CODE_39:
        svg = this.generateCode39SVG(barcode, width, height);
        break;
      case BarcodeType.QR_CODE:
        svg = this.generateQRCodeSVG(barcode, width, height);
        break;
      default:
        // Default to Code 128 for unknown types
        svg = this.generateCode128SVG(barcode, width, height);
    }

    return {
      data: Buffer.from(svg).toString('base64'),
      mimeType: 'image/svg+xml',
    };
  }

  /**
   * Generate EAN-13/UPC-A barcode SVG
   */
  private generateEAN13SVG(code: string, width: number, height: number): string {
    // EAN-13 encoding patterns (L, G, R sets)
    const L_PATTERNS = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
    const G_PATTERNS = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
    const R_PATTERNS = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];

    // First digit encoding pattern (which combination of L and G to use)
    const FIRST_DIGIT_PATTERNS = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

    // Pad code to 13 digits if necessary
    let paddedCode = code.padStart(13, '0');
    if (paddedCode.length > 13) paddedCode = paddedCode.slice(0, 13);

    const firstDigit = parseInt(paddedCode[0]);
    const pattern = FIRST_DIGIT_PATTERNS[firstDigit];

    let binaryString = '101'; // Start guard

    // Left side (digits 1-6)
    for (let i = 1; i <= 6; i++) {
      const digit = parseInt(paddedCode[i]);
      const useG = pattern[i - 1] === 'G';
      binaryString += useG ? G_PATTERNS[digit] : L_PATTERNS[digit];
    }

    binaryString += '01010'; // Center guard

    // Right side (digits 7-12)
    for (let i = 7; i <= 12; i++) {
      const digit = parseInt(paddedCode[i]);
      binaryString += R_PATTERNS[digit];
    }

    binaryString += '101'; // End guard

    return this.binaryToSVG(binaryString, paddedCode, width, height);
  }

  /**
   * Generate Code 128 barcode SVG
   */
  private generateCode128SVG(data: string, width: number, height: number): string {
    // Code 128B patterns (subset that handles most printable ASCII)
    const CODE128_PATTERNS: Record<string, string> = {
      ' ': '11011001100', '!': '11001101100', '"': '11001100110', '#': '10010011000',
      '$': '10010001100', '%': '10001001100', '&': '10011001000', "'": '10011000100',
      '(': '10001100100', ')': '11001001000', '*': '11001000100', '+': '11000100100',
      ',': '10110011100', '-': '10011011100', '.': '10011001110', '/': '10111001100',
      '0': '10011101100', '1': '10011100110', '2': '11001110010', '3': '11001011100',
      '4': '11001001110', '5': '11011100100', '6': '11001110100', '7': '11101101110',
      '8': '11101001100', '9': '11100101100', ':': '11100100110', ';': '11101100100',
      '<': '11100110100', '=': '11100110010', '>': '11011011000', '?': '11011000110',
      '@': '11000110110', 'A': '10100011000', 'B': '10001011000', 'C': '10001000110',
      'D': '10110001000', 'E': '10001101000', 'F': '10001100010', 'G': '11010001000',
      'H': '11000101000', 'I': '11000100010', 'J': '10110111000', 'K': '10110001110',
      'L': '10001101110', 'M': '10111011000', 'N': '10111000110', 'O': '10001110110',
      'P': '11101110110', 'Q': '11010001110', 'R': '11000101110', 'S': '11011101000',
      'T': '11011100010', 'U': '11011101110', 'V': '11101011000', 'W': '11101000110',
      'X': '11100010110', 'Y': '11101101000', 'Z': '11101100010', '[': '11100011010',
      '\\': '11101111010', ']': '11001000010', '^': '11110001010', '_': '10100110000',
      '`': '10100001100', 'a': '10010110000', 'b': '10010000110', 'c': '10000101100',
      'd': '10000100110', 'e': '10110010000', 'f': '10110000100', 'g': '10011010000',
      'h': '10011000010', 'i': '10000110100', 'j': '10000110010', 'k': '11000010010',
      'l': '11001010000', 'm': '11110111010', 'n': '11000010100', 'o': '10001111010',
      'p': '10100111100', 'q': '10010111100', 'r': '10010011110', 's': '10111100100',
      't': '10011110100', 'u': '10011110010', 'v': '11110100100', 'w': '11110010100',
      'x': '11110010010', 'y': '11011011110', 'z': '11011110110', '{': '11110110110',
      '|': '10101111000', '}': '10100011110', '~': '10001011110',
      'START_B': '11010010000',
      'STOP': '1100011101011',
    };

    let binaryString = CODE128_PATTERNS['START_B']; // Start Code B
    let checksum = 104; // Start B value

    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      const pattern = CODE128_PATTERNS[char];
      if (pattern) {
        binaryString += pattern;
        // Calculate checksum value (character value * position)
        const charValue = char.charCodeAt(0) - 32;
        checksum += charValue * (i + 1);
      }
    }

    // Add checksum character
    const checksumChar = String.fromCharCode((checksum % 103) + 32);
    if (CODE128_PATTERNS[checksumChar]) {
      binaryString += CODE128_PATTERNS[checksumChar];
    }

    binaryString += CODE128_PATTERNS['STOP'];

    return this.binaryToSVG(binaryString, data, width, height);
  }

  /**
   * Generate Code 39 barcode SVG
   */
  private generateCode39SVG(data: string, width: number, height: number): string {
    const CODE39_PATTERNS: Record<string, string> = {
      '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
      '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
      '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
      'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
      'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
      'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
      'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
      'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
      'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
      '-': '100101011011', '.': '110010101101', ' ': '100110101101', '$': '100100100101',
      '/': '100100101001', '+': '100101001001', '%': '101001001001', '*': '100101101101',
    };

    const upperData = data.toUpperCase();
    let binaryString = CODE39_PATTERNS['*'] + '0'; // Start with * and gap

    for (const char of upperData) {
      const pattern = CODE39_PATTERNS[char];
      if (pattern) {
        binaryString += pattern + '0'; // Add gap between characters
      }
    }

    binaryString += CODE39_PATTERNS['*']; // End with *

    return this.binaryToSVG(binaryString, data, width, height);
  }

  /**
   * Generate QR Code SVG (simplified - matrix pattern)
   */
  private generateQRCodeSVG(data: string, width: number, height: number): string {
    // Simplified QR-like pattern (for full QR, use a dedicated library like qrcode)
    const size = Math.min(width, height);
    const moduleSize = Math.floor(size / 25);
    const margin = 4;

    // Create a simple deterministic pattern based on data
    const hash = this.simpleHash(data);
    const matrix: boolean[][] = [];

    for (let y = 0; y < 21; y++) {
      matrix[y] = [];
      for (let x = 0; x < 21; x++) {
        // Finder patterns (corners)
        if (this.isFinderPattern(x, y)) {
          matrix[y][x] = this.getFinderPatternModule(x, y);
        } else {
          // Data modules based on hash
          matrix[y][x] = ((hash + x * 7 + y * 11) % 2) === 0;
        }
      }
    }

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
    svg += `<rect width="100%" height="100%" fill="white"/>`;

    for (let y = 0; y < 21; y++) {
      for (let x = 0; x < 21; x++) {
        if (matrix[y][x]) {
          svg += `<rect x="${margin + x * moduleSize}" y="${margin + y * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
        }
      }
    }

    // Add data text below (for reference)
    svg += `<text x="${size / 2}" y="${size - 2}" text-anchor="middle" font-family="monospace" font-size="8" fill="#666">${data.length > 20 ? data.slice(0, 20) + '...' : data}</text>`;
    svg += `</svg>`;

    return svg;
  }

  /**
   * Convert binary string to SVG barcode
   */
  private binaryToSVG(binaryString: string, displayText: string, width: number, height: number): string {
    const barWidth = width / binaryString.length;
    const barHeight = height - 20; // Leave space for text

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    svg += `<rect width="100%" height="100%" fill="white"/>`;

    let x = 0;
    for (const bit of binaryString) {
      if (bit === '1') {
        svg += `<rect x="${x}" y="0" width="${barWidth}" height="${barHeight}" fill="black"/>`;
      }
      x += barWidth;
    }

    // Add text below barcode
    svg += `<text x="${width / 2}" y="${height - 4}" text-anchor="middle" font-family="monospace" font-size="12" fill="black">${displayText}</text>`;
    svg += `</svg>`;

    return svg;
  }

  private isFinderPattern(x: number, y: number): boolean {
    // Top-left, top-right, bottom-left finder patterns
    return (x < 7 && y < 7) || (x >= 14 && y < 7) || (x < 7 && y >= 14);
  }

  private getFinderPatternModule(x: number, y: number): boolean {
    // Normalize coordinates to 7x7 pattern
    const px = x % 7 < 7 ? x % 7 : 6 - (x % 7);
    const py = y % 7 < 7 ? y % 7 : 6 - (y % 7);

    // Finder pattern: solid border, white inner border, solid center
    if (px === 0 || px === 6 || py === 0 || py === 6) return true;
    if (px === 1 || px === 5 || py === 1 || py === 5) return false;
    return true;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

export const barcodeService = new BarcodeService();
