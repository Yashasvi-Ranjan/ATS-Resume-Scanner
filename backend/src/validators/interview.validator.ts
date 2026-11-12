import { z } from 'zod';

export const MAX_ANSWER_CHARS = 8000;

export const interviewIdParam = z.object({
  id: z.string().uuid('Invalid interview session ID format')
});

export const answerIdParam = z.object({
  id: z.string().uuid('Invalid interview session ID format'),
  answerId: z.string().uuid('Invalid answer ID format')
});

const difficultyEnum = z.enum(['easy', 'medium', 'hard', 'mixed']);

export const createInterviewSchema = z
  .object({
    resumeId: z.string().uuid('Invalid resume ID format'),
    jobDescriptionId: z.string().uuid('Invalid job description ID format'),
    analysisId: z.string().uuid('Invalid analysis ID format').optional().nullable(),
    totalQuestions: z.number().int().min(1).max(20).optional().default(5),
    difficulty: difficultyEnum.optional().default('mixed'),
    generate: z.boolean().optional().default(false)
  })
  .strict();

export const generateQuestionsSchema = z
  .object({
    regenerate: z.boolean().optional().default(false)
  })
  .strict();

/**
 * User-authored PRACTICE question. Stored with source 'USER'; it is never AI-evaluated and is excluded
 * from report averages. source/difficulty/rationale/expectedTopics cannot be set by clients.
 */
export const addQuestionSchema = z
  .object({
    questionText: z.string().trim().min(5, 'Question text must be at least 5 characters').max(1000),
    order: z.number().int().min(1),
    category: z.string().trim().max(60).optional().nullable()
  })
  .strict();

const answerText = z
  .string()
  .trim()
  .min(1, 'Answer text cannot be empty')
  .max(MAX_ANSWER_CHARS, `Answer text must be at most ${MAX_ANSWER_CHARS} characters`);

export const submitAnswerSchema = z
  .object({
    questionId: z.string().uuid('Invalid question ID format'),
    answerText,
    evaluate: z.boolean().optional()
  })
  .strict();

export const updateAnswerSchema = z
  .object({
    answerText,
    evaluate: z.boolean().optional()
  })
  .strict();

export const updateInterviewStatusSchema = z
  .object({
    status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'])
  })
  .strict();
