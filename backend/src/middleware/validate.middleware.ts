import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../utils/apiError';

export const validateRequest = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = (await schema.query.parseAsync(req.query)) as Request['query'];
      }
      if (schema.params) {
        req.params = (await schema.params.parseAsync(req.params)) as Request['params'];
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => {
          if (err.code === 'unrecognized_keys') {
            const base = err.path.join('.');
            return {
              field: err.keys.map((k) => (base ? `${base}.${k}` : k)).join(', '),
              message: `Unexpected field(s) not allowed: ${err.keys.join(', ')}`
            };
          }
          return { field: err.path.join('.'), message: err.message };
        });
        next(ApiError.badRequest('Validation failed', formattedErrors));
      } else {
        next(error);
      }
    }
  };
};
