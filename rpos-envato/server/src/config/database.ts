import { DataSource, DataSourceOptions } from 'typeorm';
import mongoose from 'mongoose';
import path from 'path';
import logger, { logError, logInfo } from './logger';

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// PostgreSQL TypeORM Configuration
const postgresConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [path.join(__dirname, '../entities/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '../migrations/*.{ts,js}')],
  subscribers: [],
  // Connection pool settings for production
  extra: {
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  },
};

// Create TypeORM DataSource
export const AppDataSource = new DataSource(postgresConfig);

// Initialize PostgreSQL connection
export const initializePostgres = async (): Promise<DataSource> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logInfo('PostgreSQL connected successfully', {
        database: process.env.POSTGRES_DB || 'pos_db',
      });
    }
    return AppDataSource;
  } catch (error) {
    logError(error as Error, {
      context: 'PostgreSQL connection',
    });
    throw error;
  }
};

// MongoDB Configuration (for logs only)
export const initializeMongoDB = async (): Promise<typeof mongoose> => {
  try {
    const mongoUrl = process.env.MONGODB_URL;

    if (!mongoUrl) {
      throw new Error('MONGODB_URL environment variable is required');
    }

    mongoose.set('strictQuery', false);

    await mongoose.connect(mongoUrl, {
      maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE || '10'),
      minPoolSize: parseInt(process.env.MONGO_POOL_MIN || '2'),
      socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT || '45000'),
    });
    logInfo('MongoDB connected successfully (for logs)');

    return mongoose;
  } catch (error) {
    logError(error as Error, {
      context: 'MongoDB connection',
    });
    throw error;
  }
};

// Initialize all databases
export const initializeDatabases = async (): Promise<void> => {
  await initializePostgres();
  await initializeMongoDB();
};

// Close all database connections
export const closeDatabases = async (): Promise<void> => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logInfo('PostgreSQL connection closed');
  }

  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    logInfo('MongoDB connection closed');
  }
};

export default AppDataSource;
