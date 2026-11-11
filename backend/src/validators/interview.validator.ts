import { z } from 'zod';

export const interviewIdParam = z.object({
  id: z.string().uuid('Invalid interview session ID format')
});

export const answerIdParam = z.object({
  id: z.string().uuid('Invalid interview session ID format'),
  answerId: z.string().uuid('Invalid answer ID format')
});

export const createInterviewSchema = z.object({
  resumeId: z.string().uuid('Invalid resume ID format'),
  jobDescriptionId: z.string().uuid('Invalid job description ID format'),
  analysisId: z.string().uuid('Invalid analysis ID format').optional().nullable(),
  totalQuestions: z.number().int().min(1).max(20).optional().default(5)
});

export const addQuestionSchema = z.object({
  questionText: z.string().trim().min(5, 'Question text must be at least 5 characters'),
  order: z.number().int().min(1),
  category: z.string().trim().optional().nullable()
});

export const submitAnswerSchema = z.object({
  questionId: z.string().uuid('Invalid question ID format'),
  answerText: z.string().trim().min(1, 'Answer text cannot be empty')
});

export const updateAnswerSchema = z.object({
  answerText: z.string().trim().min(1, 'Answer text cannot be empty')
});

export const updateInterviewStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'])
});

export const addEvaluationSchema = z.object({
  questionId: z.string().uuid('Invalid question ID format'),
  score: z.number().min(0).max(100).optional().nullable(),
  feedback: z.string().trim().optional().nullable(),
  isMock: z.boolean().optional().default(true)
});
