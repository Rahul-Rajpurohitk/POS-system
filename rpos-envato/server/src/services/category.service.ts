import { AppDataSource } from '../config/database';
import { Category } from '../entities/Category.entity';

/**
 * Category Service - Handles category business logic
 */
export class CategoryService {
  private categoryRepository = AppDataSource.getRepository(Category);

  /**
   * Increase product count for a category
   */
  async increaseCount(categoryId: string): Promise<void> {
    try {
      await this.categoryRepository
        .createQueryBuilder()
        .update(Category)
        .set({ count: () => 'count + 1' })
        .where('id = :id', { id: categoryId })
        .execute();
    } catch (error) {
      console.error('Error increasing category count:', error);
    }
  }

  /**
   * Decrease product count for a category
   */
  async decreaseCount(categoryId: string): Promise<void> {
    try {
      await this.categoryRepository
        .createQueryBuilder()
        .update(Category)
        .set({ count: () => 'GREATEST(count - 1, 0)' })
        .where('id = :id', { id: categoryId })
        .execute();
    } catch (error) {
      console.error('Error decreasing category count:', error);
    }
  }

  /**
   * Create a new category
   */
  async createCategory(data: {
    name: string;
    image?: string;
    parentId?: string;
    businessId: string;
  }): Promise<Category> {
    const category = this.categoryRepository.create({
      name: data.name,
      image: data.image || '',
      parentId: data.parentId || null,
      businessId: data.businessId,
      count: 0,
      enabled: true,
    });

    return this.categoryRepository.save(category);
  }

  /**
   * Update a category
   */
  async updateCategory(
    categoryId: string,
    businessId: string,
    data: Partial<{ name: string; image: string; parentId: string | null }>
  ): Promise<Category | null> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, businessId },
    });

    if (!category) {
      return null;
    }

    // Prevent circular reference
    if (data.parentId === categoryId) {
      throw new Error('Category cannot be its own parent');
    }

    Object.assign(category, data);
    return this.categoryRepository.save(category);
  }

  /**
   * Delete a category (soft delete by disabling)
   */
  async deleteCategory(categoryId: string, businessId: string): Promise<boolean> {
    const result = await this.categoryRepository.update(
      { id: categoryId, businessId },
      { enabled: false }
    );

    return (result.affected ?? 0) > 0;
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: string, businessId: string): Promise<Category | null> {
    return this.categoryRepository.findOne({
      where: { id: categoryId, businessId, enabled: true },
      relations: ['parent', 'children'],
    });
  }

  /**
   * Get all categories for a business
   */
  async getCategories(businessId: string): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { businessId, enabled: true },
      relations: ['parent', 'children'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Sync all categories for a business (for mobile app)
   */
  async syncCategories(businessId: string): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { businessId, enabled: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Recalculate product count for a category
   */
  async recalculateCount(categoryId: string, businessId: string): Promise<void> {
    const productRepository = AppDataSource.getRepository('Product');

    const count = await productRepository.count({
      where: { categoryId, businessId, enabled: true },
    });

    await this.categoryRepository.update(categoryId, { count });
  }
}

export default new CategoryService();
