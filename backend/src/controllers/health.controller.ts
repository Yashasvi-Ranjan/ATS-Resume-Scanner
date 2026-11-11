import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { ApiResponse } from '../utils/apiResponse';

export class HealthController {
  static async check(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let dbHealthy = false;
      try {
        await prisma.$queryRaw`SELECT 1`;
        dbHealthy = true;
      } catch (err) {
        console.error('Database health check failed:', err);
      }

      const status = dbHealthy ? 'healthy' : 'degraded';
      const statusCode = dbHealthy ? 200 : 503;

      ApiResponse.success(
        res,
        'System health status',
        {
          status,
          service: 'CVATS Backend API',
          version: '1.0.0',
          database: dbHealthy ? 'connected' : 'disconnected',
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        },
        statusCode
      );
    } catch (error) {
      next(error);
    }
  }
}
