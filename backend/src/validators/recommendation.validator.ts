import { z } from 'zod';

export const recommendationIdParam = z.object({
  id: z.string().uuid('Invalid recommendation ID format')
});

export const analysisIdOnlyParam = z.object({
  id: z.string().uuid('Invalid analysis ID format')
});

export const updateRecommendationStatusSchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'])
});

export const createRecommendationSchema = z.object({
  category: z.enum(['IMPROVE', 'LEARN_ADD']),
  title: z.string().trim().min(2, 'Title must be at least 2 characters'),
  description: z.string().trim().min(5, 'Description must be at least 5 characters'),
  reason: z.string().trim().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).optional().default('NOT_STARTED')
}).strict(); // `source` / `details` are server-controlled and rejected if sent

export const generateRecommendationsSchema = z.object({
  force: z.boolean().optional().default(false)
}).strict();
