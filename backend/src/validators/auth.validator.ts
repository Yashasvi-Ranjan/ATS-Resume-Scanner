import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters'),
  email: z.string().trim().email('Invalid email address format').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password must not exceed 100 characters')
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address format').toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

const optionalText = (max: number) =>
  z.string().trim().max(max).optional();

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  email: z.string().trim().email('Invalid email address format').toLowerCase().optional(),
  phone: optionalText(50),
  location: optionalText(150),
  targetRole: optionalText(150),
  experienceLevel: optionalText(100),
  headline: optionalText(500),
  skills: z.array(z.string().trim().min(1).max(60)).max(100).optional()
}).refine(data => Object.values(data).some(v => v !== undefined), {
  message: 'At least one profile field must be provided'
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(100, 'New password must not exceed 100 characters')
});
