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
import logger, { logInfo, logError } from './config/logger';

const PORT = config.port;

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    logInfo('Starting POS Server...', { environment: config.env });

    // Initialize databases
    logInfo('Connecting to databases...');
    await initializeDatabases();

    // Initialize Redis cache
    logInfo('Connecting to Redis...');
    await cacheService.connect();

    // Initialize queue system
    logInfo('Initializing queue system...');
    await initializeQueues();

    // Create Express app
    const app = createApp();

    // Create HTTP server (needed for WebSocket)
    const server = http.createServer(app);

    // Initialize WebSocket server
    logInfo('Initializing WebSocket server...');
    realtimeService.initialize(server);

    // Start HTTP server
    server.listen(PORT, () => {
      logInfo('Server started successfully', {
        port: PORT,
        healthCheck: `http://localhost:${PORT}/health`,
        webSocket: `ws://localhost:${PORT}`,
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logInfo(`${signal} received. Starting graceful shutdown...`, { signal });

      server.close(async () => {
        logInfo('HTTP server closed');

        try {
          // Shutdown queue system
          await shutdownQueues();

          // Close Redis connection
          await cacheService.disconnect();

          // Close database connections
          await closeDatabases();

          logInfo('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logError(error as Error, { context: 'Shutdown' });
          process.exit(1);
        }
      });

      // Force exit after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logError(error, { context: 'Uncaught Exception' });
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise: String(promise) });
    });

  } catch (error) {
    logError(error as Error, { context: 'Server startup failed' });
    process.exit(1);
  }
}

// Start the server
startServer();
