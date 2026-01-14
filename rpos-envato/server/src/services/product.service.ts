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

    // Update product
    Object.assign(product, {
      name: params.name ?? product.name,
      sku: params.sku ?? product.sku,
      description: params.description ?? product.description,
      quantity: params.quantity ?? product.quantity,
      sellingPrice: params.sellingPrice ?? product.sellingPrice,
      purchasePrice: params.purchasePrice ?? product.purchasePrice,
      images: params.images ?? product.images,
      categoryId: newCategoryId ?? oldCategoryId,
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
      relations: ['category'],
    });
  }

  /**
   * Get products with filters and pagination
   */
  async getProducts(
    businessId: string,
    options: {
      page?: number;
      limit?: number;
      categoryId?: string;
      search?: string;
    } = {}
  ): Promise<{ products: Product[]; total: number }> {
    const { page = 1, limit = 20, categoryId, search } = options;

    const where: FindOptionsWhere<Product> = {
      businessId,
      enabled: true,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Build query
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.business_id = :businessId', { businessId })
      .andWhere('product.enabled = true');

    if (categoryId) {
      queryBuilder.andWhere('product.category_id = :categoryId', { categoryId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.sku ILIKE :search OR product.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [products, total] = await queryBuilder
      .orderBy('product.created_at', 'DESC')
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
}

export default new ProductService();
