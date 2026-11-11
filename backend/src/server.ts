import app from './app';
import { env } from './config/env';
import prisma from './config/prisma';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 CVATS Backend running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  console.log(`📖 API Documentation available at http://localhost:${env.PORT}/api/v1/docs`);
  console.log(`🔗 API Base URL: http://localhost:${env.PORT}/api/v1`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default server;
