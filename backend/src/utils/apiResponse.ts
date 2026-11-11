import { Response } from 'express';
import { ApiResponsePayload, PaginationMeta } from '../types';

export class ApiResponse {
  static success<T>(
    res: Response,
    message: string,
    data?: T,
    statusCode = 200,
    meta?: PaginationMeta | Record<string, unknown>
  ): Response {
    const payload: ApiResponsePayload<T> = {
      success: true,
      message,
      ...(data !== undefined && { data }),
      ...(meta !== undefined && { meta })
    };
    return res.status(statusCode).json(payload);
  }

  static created<T>(
    res: Response,
    message: string,
    data?: T,
    meta?: Record<string, unknown>
  ): Response {
    return ApiResponse.success(res, message, data, 201, meta);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  static error(
    res: Response,
    message: string,
    statusCode = 500,
    errors: unknown[] = []
  ): Response {
    const payload: ApiResponsePayload = {
      success: false,
      message,
      errors
    };
    return res.status(statusCode).json(payload);
  }
}
