import { AppDataSource } from '../config/database';
import { Customer } from '../entities/Customer.entity';
import { Like, FindOptionsWhere } from 'typeorm';

export interface CreateCustomerParams {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  avatar?: string;
  businessId: string;
}

/**
 * Customer Service - Handles customer business logic
 */
export class CustomerService {
  private customerRepository = AppDataSource.getRepository(Customer);

  /**
   * Create a new customer
   */
  async createCustomer(params: CreateCustomerParams): Promise<Customer> {
    const customer = this.customerRepository.create({
      name: params.name,
      email: params.email || '',
      phone: params.phone || '',
      address: params.address || '',
      avatar: params.avatar || '',
      businessId: params.businessId,
      enabled: true,
    });

    return this.customerRepository.save(customer);
  }

  /**
   * Update a customer
   */
  async updateCustomer(
    customerId: string,
    businessId: string,
    params: Partial<CreateCustomerParams>
  ): Promise<Customer | null> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, businessId },
    });

    if (!customer) {
      return null;
    }

    Object.assign(customer, {
      name: params.name ?? customer.name,
      email: params.email ?? customer.email,
      phone: params.phone ?? customer.phone,
      address: params.address ?? customer.address,
      avatar: params.avatar ?? customer.avatar,
    });

    return this.customerRepository.save(customer);
  }

  /**
   * Delete a customer (soft delete)
   */
  async deleteCustomer(customerId: string, businessId: string): Promise<boolean> {
    const result = await this.customerRepository.update(
      { id: customerId, businessId },
      { enabled: false }
    );

    return (result.affected ?? 0) > 0;
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId: string, businessId: string): Promise<Customer | null> {
    return this.customerRepository.findOne({
      where: { id: customerId, businessId, enabled: true },
    });
  }

  /**
   * Get customers with filters and pagination
   */
  async getCustomers(
    businessId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
    } = {}
  ): Promise<{ customers: Customer[]; total: number }> {
    const { page = 1, limit = 20, search } = options;

    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.business_id = :businessId', { businessId })
      .andWhere('customer.enabled = true');

    if (search) {
      queryBuilder.andWhere(
        '(customer.name ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [customers, total] = await queryBuilder
      .orderBy('customer.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { customers, total };
  }

  /**
   * Sync all customers for a business (for mobile app)
   */
  async syncCustomers(businessId: string): Promise<Customer[]> {
    return this.customerRepository.find({
      where: { businessId, enabled: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get customer order history
   */
  async getCustomerOrders(customerId: string, businessId: string) {
    const orderRepository = AppDataSource.getRepository('Order');

    return orderRepository.find({
      where: { customerId, businessId },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }
}

export default new CustomerService();
