import { RedisOptions } from 'ioredis';

export interface RedisConfig extends RedisOptions {
  host: string;
  port: number;
  maxRetriesPerRequest: null;
}

export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null,
  retryStrategy: (times: number) => {
    if (times > 3) {
      console.error('Redis connection failed after 3 retries');
      return null;
    }
    return Math.min(times * 200, 2000);
  },
};

export default redisConfig;
