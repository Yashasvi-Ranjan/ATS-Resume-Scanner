import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { env } from '../config/env';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  err: Error | ApiError | unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. ApiError
  if (err instanceof ApiError) {
    ApiResponse.error(res, err.message, err.statusCode, err.errors);
    return;
  }

  // 2. Multer Errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      ApiResponse.error(
        res,
        `File size exceeds maximum allowed limit of ${env.MAX_FILE_SIZE_MB}MB`,
        413
      );
      return;
    }
    ApiResponse.error(res, `File upload error: ${err.message}`, 400);
    return;
  }

  // 3. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
      ApiResponse.error(
        res,
        `A record with this ${target} already exists`,
        409,
        [{ field: target, message: 'Unique constraint failed' }]
      );
      return;
    }
    if (err.code === 'P2025') {
      ApiResponse.error(res, 'Record not found in database', 404);
      return;
    }
  }

  // 4. JSON parse error (malformed request body)
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    ApiResponse.error(res, 'Malformed JSON in request body', 400);
    return;
  }

  // 5. Unhandled / Unexpected Errors
  const errorMessage =
    env.NODE_ENV === 'production'
      ? 'An unexpected error occurred on the server'
      : (err as Error).message || 'Internal server error';

  const errors =
    env.NODE_ENV === 'development' && (err as Error).stack
      ? [{ stack: (err as Error).stack }]
      : [];

  console.error('Unhandled error:', err);
  ApiResponse.error(res, errorMessage, 500, errors);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  ApiResponse.error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};
