import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product.entity';
import { Category } from '../entities/Category.entity';
import { Like, FindOptionsWhere } from 'typeorm';
import categoryService from './category.service';
import logService from './log.service';
import { User } from '../entities/User.entity';

export interface CreateProductParams {
  name: string;
  sku?: string;
  description?: string;
  quantity?: number;
  sellingPrice: number;
  purchasePrice?: number;
  images?: string[];
  categoryId?: string;
  businessId: string;
  // Partner-ready fields
  brand?: string;
  primaryBarcode?: string;
  taxClass?: string;
  unitOfMeasure?: string;
  weight?: number;
  weightUnit?: string;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string;
  partnerAvailability?: Record<string, boolean>;
  tags?: string[];
  defaultSupplierId?: string;
}

export interface ProductFilterOptions {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
  // Advanced filters
  supplierId?: string;
  brand?: string;
  hasBarcode?: boolean;
  partnerAvailable?: string;
  tags?: string[];
  minMargin?: number;
  maxMargin?: number;
}

/**
 * Product Service - Handles product business logic
 */
export class ProductService {
  private productRepository = AppDataSource.getRepository(Product);

  /**
   * Create a new product
   */
  async createProduct(params: CreateProductParams, user: User): Promise<Product> {
    const product = this.productRepository.create({
      // Core fields
      name: params.name,
      sku: params.sku || '',
      description: params.description || '',
      quantity: params.quantity || 0,
      sellingPrice: params.sellingPrice,
      purchasePrice: params.purchasePrice || 0,
      images: params.images || [],
      categoryId: params.categoryId || null,
      businessId: params.businessId,
      soldQuantity: 0,
      soldAmount: 0,
      profit: 0,
      enabled: true,
      // Partner-ready: Sourcing & Brand
      brand: params.brand || null,
      primaryBarcode: params.primaryBarcode || null,
      taxClass: params.taxClass || 'standard',
      unitOfMeasure: params.unitOfMeasure || 'each',
      // Partner-ready: Shipping Dimensions
      weight: params.weight || null,
      weightUnit: params.weightUnit || 'kg',
      length: params.length || null,
      width: params.width || null,
      height: params.height || null,
      dimensionUnit: params.dimensionUnit || 'cm',
      // Partner-ready: Availability & Tags
      partnerAvailability: params.partnerAvailability || {},
      tags: params.tags || [],
      defaultSupplierId: params.defaultSupplierId || null,
    });

    const savedProduct = await this.productRepository.save(product);

    // Update category count
    if (params.categoryId) {
      await categoryService.increaseCount(params.categoryId);
    }

    // Create log entry
    await logService.createNewProduct(savedProduct, user);

    return savedProduct;
  }

  /**
   * Update a product
   */
  async updateProduct(
    productId: string,
    businessId: string,
    params: Partial<CreateProductParams>,
    user: User
  ): Promise<Product | null> {
    const product = await this.productRepository.findOne({
      where: { id: productId, businessId },
    });

    if (!product) {
      return null;
    }

    // Handle category change
    const oldCategoryId = product.categoryId;
    const newCategoryId = params.categoryId;

    if (oldCategoryId !== newCategoryId) {
      if (oldCategoryId) {
        await categoryService.decreaseCount(oldCategoryId);
      }
      if (newCategoryId) {
        await categoryService.increaseCount(newCategoryId);
      }
    }

    // Update product - core fields
    Object.assign(product, {
      name: params.name ?? product.name,
      sku: params.sku ?? product.sku,
      description: params.description ?? product.description,
      quantity: params.quantity ?? product.quantity,
      sellingPrice: params.sellingPrice ?? product.sellingPrice,
      purchasePrice: params.purchasePrice ?? product.purchasePrice,
      images: params.images ?? product.images,
      categoryId: newCategoryId ?? oldCategoryId,
      // Partner-ready: Sourcing & Brand
      brand: params.brand ?? product.brand,
      primaryBarcode: params.primaryBarcode ?? product.primaryBarcode,
      taxClass: params.taxClass ?? product.taxClass,
      unitOfMeasure: params.unitOfMeasure ?? product.unitOfMeasure,
      // Partner-ready: Shipping Dimensions
      weight: params.weight ?? product.weight,
      weightUnit: params.weightUnit ?? product.weightUnit,
      length: params.length ?? product.length,
      width: params.width ?? product.width,
      height: params.height ?? product.height,
      dimensionUnit: params.dimensionUnit ?? product.dimensionUnit,
      // Partner-ready: Availability & Tags
      partnerAvailability: params.partnerAvailability ?? product.partnerAvailability,
      tags: params.tags ?? product.tags,
      defaultSupplierId: params.defaultSupplierId ?? product.defaultSupplierId,
    });

    const savedProduct = await this.productRepository.save(product);

    // Create log entry
    await logService.editProduct(savedProduct, user);

    return savedProduct;
  }

  /**
   * Delete a product (soft delete)
   */
  async deleteProduct(productId: string, businessId: string): Promise<boolean> {
    const product = await this.productRepository.findOne({
      where: { id: productId, businessId },
    });

    if (!product) {
      return false;
    }

    // Decrease category count
    if (product.categoryId) {
      await categoryService.decreaseCount(product.categoryId);
    }

    // Soft delete
    await this.productRepository.update(productId, { enabled: false });

    return true;
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string, businessId: string): Promise<Product | null> {
    return this.productRepository.findOne({
      where: { id: productId, businessId, enabled: true },
      relations: ['category', 'defaultSupplier'],
    });
  }

  /**
   * Get products with advanced filters and pagination
   */
  async getProducts(
    businessId: string,
    options: ProductFilterOptions = {}
  ): Promise<{ products: Product[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      categoryId,
      search,
      supplierId,
      brand,
      hasBarcode,
      partnerAvailable,
      tags,
      minMargin,
      maxMargin,
    } = options;

    // Always use query builder for advanced filtering
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.defaultSupplier', 'defaultSupplier')
      .where('product.businessId = :businessId', { businessId })
      .andWhere('product.enabled = true');

    // Category filter
    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    // Search filter (name, sku, description, brand, barcode)
    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.sku ILIKE :search OR product.description ILIKE :search OR product.brand ILIKE :search OR product.primaryBarcode ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Supplier filter
    if (supplierId) {
      queryBuilder.andWhere('product.defaultSupplierId = :supplierId', { supplierId });
    }

    // Brand filter
    if (brand) {
      queryBuilder.andWhere('product.brand = :brand', { brand });
    }

    // Barcode filter
    if (hasBarcode === true) {
      queryBuilder.andWhere('product.primaryBarcode IS NOT NULL AND product.primaryBarcode != :empty', { empty: '' });
    } else if (hasBarcode === false) {
      queryBuilder.andWhere('(product.primaryBarcode IS NULL OR product.primaryBarcode = :empty)', { empty: '' });
    }

    // Partner availability filter
    if (partnerAvailable) {
      queryBuilder.andWhere(
        `product.partnerAvailability->:partner = 'true'`,
        { partner: partnerAvailable }
      );
    }

    // Tags filter (product must have ALL specified tags)
    if (tags && tags.length > 0) {
      queryBuilder.andWhere('product.tags @> :tags', { tags });
    }

    // Margin filters (margin = (sellingPrice - purchasePrice) / sellingPrice * 100)
    if (minMargin !== undefined || maxMargin !== undefined) {
      // Calculate margin percentage: ((selling - purchase) / selling) * 100
      // Only apply to products where sellingPrice > 0 to avoid division by zero
      queryBuilder.andWhere('product.sellingPrice > 0');

      if (minMargin !== undefined) {
        queryBuilder.andWhere(
          '((product.sellingPrice - product.purchasePrice) / product.sellingPrice * 100) >= :minMargin',
          { minMargin }
        );
      }
      if (maxMargin !== undefined) {
        queryBuilder.andWhere(
          '((product.sellingPrice - product.purchasePrice) / product.sellingPrice * 100) <= :maxMargin',
          { maxMargin }
        );
      }
    }

    const [products, total] = await queryBuilder
      .orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { products, total };
  }

  /**
   * Sync all products for a business (for mobile app)
   */
  async syncProducts(businessId: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { businessId, enabled: true },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get product count for business
   */
  async getProductCount(businessId: string): Promise<number> {
    return this.productRepository.count({
      where: { businessId, enabled: true },
    });
  }

  /**
   * Get product activity logs
   */
  async getProductLogs(productId: string, businessId: string, page: number = 1, limit: number = 20) {
    return logService.getProductLogs(productId, businessId, page, limit);
  }

  /**
   * Update product inventory
   */
  async updateInventory(
    productId: string,
    businessId: string,
    quantityChange: number
  ): Promise<Product | null> {
    const product = await this.productRepository.findOne({
      where: { id: productId, businessId },
    });

    if (!product) {
      return null;
    }

    const newQuantity = Math.max(0, product.quantity + quantityChange);
    await this.productRepository.update(productId, { quantity: newQuantity });

    return this.getProductById(productId, businessId);
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(businessId: string, threshold: number = 10): Promise<Product[]> {
    return this.productRepository
      .createQueryBuilder('product')
      .where('product.business_id = :businessId', { businessId })
      .andWhere('product.enabled = true')
      .andWhere('product.quantity <= :threshold', { threshold })
      .orderBy('product.quantity', 'ASC')
      .getMany();
  }

  /**
   * Get top selling products
   */
  async getTopSellingProducts(businessId: string, limit: number = 20): Promise<Product[]> {
    return this.productRepository.find({
      where: { businessId, enabled: true },
      order: { soldQuantity: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get unique brands for filter dropdown
   */
  async getBrands(businessId: string): Promise<string[]> {
    const result = await this.productRepository
      .createQueryBuilder('product')
      .select('DISTINCT product.brand', 'brand')
      .where('product.businessId = :businessId', { businessId })
      .andWhere('product.enabled = true')
      .andWhere('product.brand IS NOT NULL')
      .andWhere("product.brand != ''")
      .orderBy('product.brand', 'ASC')
      .getRawMany();

    return result.map((r) => r.brand);
  }

  /**
   * Get unique tags for filter dropdown
   */
  async getTags(businessId: string): Promise<string[]> {
    const result = await this.productRepository
      .createQueryBuilder('product')
      .select('DISTINCT unnest(product.tags)', 'tag')
      .where('product.businessId = :businessId', { businessId })
      .andWhere('product.enabled = true')
      .orderBy('tag', 'ASC')
      .getRawMany();

    return result.map((r) => r.tag);
  }

  /**
   * Export products available for a specific partner
   * Returns products with partnerAvailability[partner] = true
   */
  async exportForPartner(
    businessId: string,
    partner: string
  ): Promise<{
    partner: string;
    exportedAt: string;
    count: number;
    products: Partial<Product>[];
  }> {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.defaultSupplier', 'defaultSupplier')
      .where('product.businessId = :businessId', { businessId })
      .andWhere('product.enabled = true')
      .andWhere(`product.partnerAvailability->:partner = 'true'`, { partner })
      .orderBy('product.name', 'ASC')
      .getMany();

    // Transform to partner-friendly export format
    const exportProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      brand: p.brand,
      primaryBarcode: p.primaryBarcode,
      category: p.category?.name || null,
      sellingPrice: p.sellingPrice,
      taxClass: p.taxClass,
      unitOfMeasure: p.unitOfMeasure,
      quantity: p.quantity,
      // Shipping info for delivery logistics
      weight: p.weight,
      weightUnit: p.weightUnit,
      length: p.length,
      width: p.width,
      height: p.height,
      dimensionUnit: p.dimensionUnit,
      // Images for partner catalog
      images: p.images,
      tags: p.tags,
    }));

    return {
      partner,
      exportedAt: new Date().toISOString(),
      count: exportProducts.length,
      products: exportProducts,
    };
  }

  /**
   * Get products by barcode (for scanning)
   */
  async getProductByBarcode(businessId: string, barcode: string): Promise<Product | null> {
    return this.productRepository.findOne({
      where: { businessId, primaryBarcode: barcode, enabled: true },
      relations: ['category', 'defaultSupplier'],
    });
  }

  /**
   * Get products by supplier
   */
  async getProductsBySupplier(
    businessId: string,
    supplierId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ products: Product[]; total: number }> {
    const { page = 1, limit = 20 } = options;

    const [products, total] = await this.productRepository.findAndCount({
      where: { businessId, defaultSupplierId: supplierId, enabled: true },
      relations: ['category', 'defaultSupplier'],
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { products, total };
  }

  /**
   * Bulk update partner availability
   */
  async bulkUpdatePartnerAvailability(
    businessId: string,
    productIds: string[],
    partner: string,
    available: boolean
  ): Promise<number> {
    // Use raw query for JSONB update
    const result = await this.productRepository
      .createQueryBuilder()
      .update(Product)
      .set({
        partnerAvailability: () =>
          `jsonb_set(COALESCE(partner_availability, '{}'), '{${partner}}', '${available}')`,
      })
      .where('businessId = :businessId', { businessId })
      .andWhere('id IN (:...productIds)', { productIds })
      .andWhere('enabled = true')
      .execute();

    return result.affected || 0;
  }

  /**
   * Get partner availability summary
   */
  async getPartnerSummary(businessId: string): Promise<Record<string, number>> {
    const partners = ['doordash', 'ubereats', 'grubhub', 'postmates', 'instacart'];
    const summary: Record<string, number> = {};

    for (const partner of partners) {
      const count = await this.productRepository
        .createQueryBuilder('product')
        .where('product.businessId = :businessId', { businessId })
        .andWhere('product.enabled = true')
        .andWhere(`product.partnerAvailability->:partner = 'true'`, { partner })
        .getCount();

      summary[partner] = count;
    }

    return summary;
  }
}

export default new ProductService();
