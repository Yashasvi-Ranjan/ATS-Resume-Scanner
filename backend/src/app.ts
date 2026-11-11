import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import apiRouter from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { generalRateLimiter } from './middleware/rateLimiter.middleware';

export const createApp = (): Application => {
  const app = express();

  // 1. Security HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Swagger UI to load resources
      crossOriginEmbedderPolicy: false
    })
  );

  // 2. CORS configuration for frontend
  const allowedOrigins = [env.CORS_ORIGIN, 'http://localhost:5173', 'http://localhost:3000'];
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error('CORS request blocked by security policy'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );

  // 3. Request Logging
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // 4. Rate Limiting for general API traffic
  app.use(generalRateLimiter);

  // 5. Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 6. Swagger API Documentation
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/v1/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // 7. Base Health & Info Root
  app.get('/', (_req, res) => {
    res.json({
      service: 'CVATS Backend API',
      status: 'running',
      version: '1.0.0',
      docs: '/api/v1/docs',
      apiPrefix: '/api/v1'
    });
  });

  // 8. REST API v1 Routes
  app.use('/api/v1', apiRouter);

  // 9. 404 handler
  app.use(notFoundHandler);

  // 10. Centralized error handler
  app.use(errorHandler);

  return app;
};

export default createApp();
