require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/utils/logger');
const prisma = require('./src/config/database');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  logger.error('Copy .env.example to .env and fill in the values');
  process.exit(1);
}

const start = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('PostgreSQL connected successfully');

    const server = app.listen(PORT, () => {
      logger.info(`AnyMentor API running on port ${PORT} [${NODE_ENV}]`);
      if (NODE_ENV !== 'production') {
        logger.info(`API Docs: http://localhost:${PORT}/api/docs`);
        logger.info(`Health:   http://localhost:${PORT}/api/v1/health`);
      }
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Graceful shutdown...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Database disconnected. Bye!');
        process.exit(0);
      });

      // Force kill after 10s
      setTimeout(() => {
        logger.error('Forced shutdown after 10s');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Server startup failed:', err.message);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Unhandled errors
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

start();
