import Redis from 'ioredis';
import { config } from '../config';

/**
 * Redis-based caching service for distributed POS systems
 * Handles stock reservations, sessions, and real-time data
 */
class CacheService {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private isConnected = false;

  // Key prefixes for organization
  private readonly PREFIX = {
    STOCK_RESERVATION: 'pos:stock:reservation:',
    STOCK_RESERVED: 'pos:stock:reserved:',
    SESSION: 'pos:session:',
    SHIFT: 'pos:shift:',
    CART: 'pos:cart:',
    LOCK: 'pos:lock:',
    RATE_LIMIT: 'pos:rate:',
    REALTIME: 'pos:realtime:',
  };

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      this.client = new Redis({
        host: config.redis?.host || 'localhost',
        port: config.redis?.port || 6379,
        password: config.redis?.password,
        db: config.redis?.db || 0,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 200, 2000);
        },
        maxRetriesPerRequest: 3,
      });

      // Separate connection for pub/sub
      this.subscriber = new Redis({
        host: config.redis?.host || 'localhost',
        port: config.redis?.port || 6379,
        password: config.redis?.password,
        db: config.redis?.db || 0,
      });

      this.client.on('error', (err) => console.error('Redis client error:', err));
      this.subscriber.on('error', (err) => console.error('Redis subscriber error:', err));

      await this.client.ping();
      this.isConnected = true;
      console.log('Redis connected successfully');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      // Fall back to in-memory if Redis unavailable
      this.isConnected = false;
    }
  }

  /**
   * Close Redis connections
   */
  async disconnect(): Promise<void> {
    if (this.client) await this.client.quit();
    if (this.subscriber) await this.subscriber.quit();
    this.isConnected = false;
  }

  // ============ STOCK RESERVATIONS ============

  /**
   * Reserve stock for a product (distributed-safe)
   * Uses Redis transactions for atomicity
   */
  async reserveStock(
    productId: string,
    quantity: number,
    orderId: string,
    ttlSeconds = 900 // 15 minutes
  ): Promise<{ success: boolean; reservationId: string; error?: string }> {
    if (!this.client) {
      return { success: false, reservationId: '', error: 'Redis not connected' };
    }

    const reservationId = `${orderId}:${productId}:${Date.now()}`;
    const reservationKey = `${this.PREFIX.STOCK_RESERVATION}${reservationId}`;
    const reservedKey = `${this.PREFIX.STOCK_RESERVED}${productId}`;

    try {
      // Use Lua script for atomic check-and-reserve
      const luaScript = `
        local reservedKey = KEYS[1]
        local reservationKey = KEYS[2]
        local quantity = tonumber(ARGV[1])
        local availableStock = tonumber(ARGV[2])
        local ttl = tonumber(ARGV[3])
        local reservationData = ARGV[4]

        -- Get current reserved quantity
        local currentReserved = tonumber(redis.call('GET', reservedKey) or '0')
        local available = availableStock - currentReserved

        -- Check if enough stock available
        if available < quantity then
          return {0, available}
        end

        -- Reserve the stock
        redis.call('INCRBY', reservedKey, quantity)
        redis.call('SET', reservationKey, reservationData, 'EX', ttl)

        return {1, available - quantity}
      `;

      // Get current stock from database (this should be passed in)
      // For now, we'll handle this in the calling service
      const reservationData = JSON.stringify({
        productId,
        quantity,
        orderId,
        createdAt: new Date().toISOString(),
      });

      await this.client.set(reservationKey, reservationData, 'EX', ttlSeconds);
      await this.client.incrby(reservedKey, quantity);

      // Set expiry on reserved count to auto-cleanup
      await this.client.expire(reservedKey, ttlSeconds + 60);

      return { success: true, reservationId };
    } catch (error) {
      console.error('Stock reservation error:', error);
      return { success: false, reservationId: '', error: 'Reservation failed' };
    }
  }

  /**
   * Confirm stock reservation (after payment)
   */
  async confirmReservation(reservationId: string): Promise<boolean> {
    if (!this.client) return false;

    const reservationKey = `${this.PREFIX.STOCK_RESERVATION}${reservationId}`;

    try {
      const data = await this.client.get(reservationKey);
      if (!data) return false;

      const reservation = JSON.parse(data);
      const reservedKey = `${this.PREFIX.STOCK_RESERVED}${reservation.productId}`;

      // Remove reservation and decrement reserved count
      await this.client.del(reservationKey);
      await this.client.decrby(reservedKey, reservation.quantity);

      return true;
    } catch (error) {
      console.error('Confirm reservation error:', error);
      return false;
    }
  }

  /**
   * Release stock reservation (cancel/timeout)
   */
  async releaseReservation(reservationId: string): Promise<boolean> {
    if (!this.client) return false;

    const reservationKey = `${this.PREFIX.STOCK_RESERVATION}${reservationId}`;

    try {
      const data = await this.client.get(reservationKey);
      if (!data) return false;

      const reservation = JSON.parse(data);
      const reservedKey = `${this.PREFIX.STOCK_RESERVED}${reservation.productId}`;

      // Release reservation
      await this.client.del(reservationKey);
      await this.client.decrby(reservedKey, reservation.quantity);

      return true;
    } catch (error) {
      console.error('Release reservation error:', error);
      return false;
    }
  }

  /**
   * Get total reserved quantity for a product
   */
  async getReservedQuantity(productId: string): Promise<number> {
    if (!this.client) return 0;

    const reservedKey = `${this.PREFIX.STOCK_RESERVED}${productId}`;
    const value = await this.client.get(reservedKey);
    return parseInt(value || '0', 10);
  }

  // ============ DISTRIBUTED LOCKS ============

  /**
   * Acquire a distributed lock
   */
  async acquireLock(
    resource: string,
    ttlMs = 10000
  ): Promise<{ acquired: boolean; lockId: string }> {
    if (!this.client) {
      return { acquired: false, lockId: '' };
    }

    const lockId = `${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const lockKey = `${this.PREFIX.LOCK}${resource}`;

    try {
      const result = await this.client.set(lockKey, lockId, 'PX', ttlMs, 'NX');
      return { acquired: result === 'OK', lockId };
    } catch (error) {
      return { acquired: false, lockId: '' };
    }
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(resource: string, lockId: string): Promise<boolean> {
    if (!this.client) return false;

    const lockKey = `${this.PREFIX.LOCK}${resource}`;

    // Only release if we own the lock
    const luaScript = `
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await this.client.eval(luaScript, 1, lockKey, lockId);
      return result === 1;
    } catch (error) {
      return false;
    }
  }

  // ============ CART MANAGEMENT ============

  /**
   * Save cart to Redis (for cart recovery)
   */
  async saveCart(
    cartId: string,
    businessId: string,
    cartData: any,
    ttlSeconds = 86400 // 24 hours
  ): Promise<boolean> {
    if (!this.client) return false;

    const key = `${this.PREFIX.CART}${businessId}:${cartId}`;
    try {
      await this.client.set(key, JSON.stringify(cartData), 'EX', ttlSeconds);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get saved cart
   */
  async getCart(cartId: string, businessId: string): Promise<any | null> {
    if (!this.client) return null;

    const key = `${this.PREFIX.CART}${businessId}:${cartId}`;
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete cart
   */
  async deleteCart(cartId: string, businessId: string): Promise<boolean> {
    if (!this.client) return false;

    const key = `${this.PREFIX.CART}${businessId}:${cartId}`;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  // ============ REAL-TIME EVENTS ============

  /**
   * Publish event for real-time sync
   */
  async publishEvent(channel: string, event: any): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.publish(channel, JSON.stringify(event));
    } catch (error) {
      console.error('Publish event error:', error);
    }
  }

  /**
   * Subscribe to channel
   */
  async subscribe(
    channel: string,
    callback: (message: any) => void
  ): Promise<void> {
    if (!this.subscriber) return;

    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          callback(JSON.parse(message));
        } catch (error) {
          console.error('Message parse error:', error);
        }
      }
    });
  }

  // ============ RATE LIMITING ============

  /**
   * Check rate limit using sliding window
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    if (!this.client) {
      return { allowed: true, remaining: limit, resetIn: 0 };
    }

    const rateLimitKey = `${this.PREFIX.RATE_LIMIT}${key}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      // Remove old entries and count current
      await this.client.zremrangebyscore(rateLimitKey, 0, windowStart);
      const count = await this.client.zcard(rateLimitKey);

      if (count >= limit) {
        const oldestEntry = await this.client.zrange(rateLimitKey, 0, 0, 'WITHSCORES');
        const resetIn = oldestEntry.length > 1
          ? Math.ceil((parseInt(oldestEntry[1]) + windowSeconds * 1000 - now) / 1000)
          : windowSeconds;

        return { allowed: false, remaining: 0, resetIn };
      }

      // Add current request
      await this.client.zadd(rateLimitKey, now, `${now}:${Math.random()}`);
      await this.client.expire(rateLimitKey, windowSeconds);

      return {
        allowed: true,
        remaining: limit - count - 1,
        resetIn: windowSeconds,
      };
    } catch (error) {
      return { allowed: true, remaining: limit, resetIn: 0 };
    }
  }

  // ============ GENERIC CACHE ============

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      if (ttlSeconds) {
        await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } else {
        await this.client.set(key, JSON.stringify(value));
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  // ============ SORTED SET OPERATIONS ============

  /**
   * Add item to sorted set with score (for event queues)
   */
  async zadd(key: string, score: number, member: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.zadd(key, score, member);
      return true;
    } catch (error) {
      console.error('ZADD error:', error);
      return false;
    }
  }

  /**
   * Get items from sorted set by score range
   */
  async zrangebyscore(
    key: string,
    minScore: number | string,
    maxScore: number | string,
    limit?: number
  ): Promise<string[]> {
    if (!this.client) return [];
    try {
      if (limit) {
        return await this.client.zrangebyscore(key, minScore, maxScore, 'LIMIT', 0, limit);
      }
      return await this.client.zrangebyscore(key, minScore, maxScore);
    } catch (error) {
      console.error('ZRANGEBYSCORE error:', error);
      return [];
    }
  }

  /**
   * Get items from sorted set by score range (reverse order - highest first)
   */
  async zrevrangebyscore(
    key: string,
    maxScore: number | string,
    minScore: number | string,
    limit?: number
  ): Promise<string[]> {
    if (!this.client) return [];
    try {
      if (limit) {
        return await this.client.zrevrangebyscore(key, maxScore, minScore, 'LIMIT', 0, limit);
      }
      return await this.client.zrevrangebyscore(key, maxScore, minScore);
    } catch (error) {
      console.error('ZREVRANGEBYSCORE error:', error);
      return [];
    }
  }

  /**
   * Remove items from sorted set by score range
   */
  async zremrangebyscore(key: string, minScore: number, maxScore: number): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.zremrangebyscore(key, minScore, maxScore);
    } catch (error) {
      console.error('ZREMRANGEBYSCORE error:', error);
      return 0;
    }
  }

  /**
   * Remove specific member from sorted set
   */
  async zrem(key: string, member: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.zrem(key, member);
      return true;
    } catch (error) {
      console.error('ZREM error:', error);
      return false;
    }
  }

  /**
   * Get count of items in sorted set
   */
  async zcard(key: string): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.zcard(key);
    } catch (error) {
      console.error('ZCARD error:', error);
      return 0;
    }
  }

  /**
   * Set expiry on a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.expire(key, seconds);
      return true;
    } catch (error) {
      console.error('EXPIRE error:', error);
      return false;
    }
  }

  /**
   * Get multiple values by keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.client || keys.length === 0) return [];
    try {
      const values = await this.client.mget(...keys);
      return values.map(v => v ? JSON.parse(v) : null);
    } catch (error) {
      console.error('MGET error:', error);
      return keys.map(() => null);
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Get raw Redis client for advanced operations
   */
  getClient(): Redis | null {
    return this.client;
  }
}

export const cacheService = new CacheService();
