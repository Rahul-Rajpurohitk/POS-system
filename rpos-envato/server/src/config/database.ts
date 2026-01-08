import { DataSource, DataSourceOptions } from 'typeorm';
import mongoose from 'mongoose';
import path from 'path';

// PostgreSQL TypeORM Configuration
const postgresConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://pos_user:pos_password@localhost:5432/pos_db',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [path.join(__dirname, '../entities/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '../migrations/*.{ts,js}')],
  subscribers: [],
};

// Create TypeORM DataSource
export const AppDataSource = new DataSource(postgresConfig);

// Initialize PostgreSQL connection
export const initializePostgres = async (): Promise<DataSource> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('PostgreSQL connected successfully');
    }
    return AppDataSource;
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    throw error;
  }
};

// MongoDB Configuration (for logs only)
export const initializeMongoDB = async (): Promise<typeof mongoose> => {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/pos_logs';

    mongoose.set('strictQuery', false);

    await mongoose.connect(mongoUrl);
    console.log('MongoDB connected successfully (for logs)');

    return mongoose;
  } catch (error) {
    console.error('MongoDB connection error:', error);
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
    console.log('PostgreSQL connection closed');
  }

  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

export default AppDataSource;
