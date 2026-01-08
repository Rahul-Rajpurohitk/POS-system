import 'reflect-metadata';
import dotenv from 'dotenv';
import http from 'http';

// Load environment variables
dotenv.config();

import { createApp } from './app';
import { initializeDatabases, closeDatabases } from './config/database';
import { initializeQueues, shutdownQueues } from './queues';
import { cacheService } from './services/cache.service';
import { realtimeService } from './services/realtime.service';
import { config } from './config';

const PORT = config.port;

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    console.log('Starting POS Server...');
    console.log(`Environment: ${config.env}`);

    // Initialize databases
    console.log('Connecting to databases...');
    await initializeDatabases();

    // Initialize Redis cache
    console.log('Connecting to Redis...');
    await cacheService.connect();

    // Initialize queue system
    console.log('Initializing queue system...');
    await initializeQueues();

    // Create Express app
    const app = createApp();

    // Create HTTP server (needed for WebSocket)
    const server = http.createServer(app);

    // Initialize WebSocket server
    console.log('Initializing WebSocket server...');
    realtimeService.initialize(server);

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`WebSocket: ws://localhost:${PORT}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('HTTP server closed');

        try {
          // Shutdown queue system
          await shutdownQueues();

          // Close Redis connection
          await cacheService.disconnect();

          // Close database connections
          await closeDatabases();

          console.log('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force exit after 30 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
