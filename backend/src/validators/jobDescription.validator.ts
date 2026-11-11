import { z } from 'zod';

export const jobDescriptionIdParam = z.object({
  id: z.string().uuid('Invalid job description ID format')
});

export const createJobDescriptionSchema = z.object({
  title: z.string().trim().min(2, 'Job title must be at least 2 characters').max(200, 'Job title must not exceed 200 characters'),
  companyName: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().min(10, 'Job description must be at least 10 characters'),
  requiredSkills: z.array(z.string().trim().min(1)).min(1, 'At least one required skill must be provided'),
  preferredSkills: z.array(z.string().trim().min(1)).optional().default([]),
  experienceRequirements: z.string().trim().optional().nullable(),
  educationRequirements: z.string().trim().optional().nullable()
});

export const updateJobDescriptionSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  companyName: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().min(10).optional(),
  requiredSkills: z.array(z.string().trim().min(1)).optional(),
  preferredSkills: z.array(z.string().trim().min(1)).optional(),
  experienceRequirements: z.string().trim().optional().nullable(),
  educationRequirements: z.string().trim().optional().nullable()
});
