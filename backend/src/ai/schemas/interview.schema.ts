import { z } from 'zod';

export const QUESTION_CATEGORIES = ['technical', 'project', 'experience', 'problem_solving', 'behavioral', 'scenario'] as const;
export const QUESTION_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const INTERVIEW_DIFFICULTY_SETTINGS = ['easy', 'medium', 'hard', 'mixed'] as const;
export const INTERVIEW_DISCLAIMER = 'Coaching feedback, not a hiring decision.' as const;

export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];
export type InterviewDifficultySetting = (typeof INTERVIEW_DIFFICULTY_SETTINGS)[number];

const str = (max: number) => z.string().trim().max(max);
const strList = (maxItems: number, maxLen = 400) => z.array(str(maxLen).min(1)).max(maxItems).default([]);

export const GeneratedQuestionSchema = z.object({
  questionText: str(1000).min(10),
  category: z.enum(QUESTION_CATEGORIES),
  difficulty: z.enum(QUESTION_DIFFICULTIES),
  /** Which resume/JD fact this question targets (verified deterministically after generation). */
  rationale: str(600).min(3),
  expectedTopics: z.array(str(120).min(1)).max(12).default([])
});

export const GeneratedQuestionsSchema = z.object({
  questions: z.array(GeneratedQuestionSchema).max(40)
});
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;
export type GeneratedQuestions = z.infer<typeof GeneratedQuestionsSchema>;

export const DIMENSION_NAMES = [
  'technicalCorrectness',
  'relevance',
  'completeness',
  'clarity',
  'communication',
  'depth',
  'roleUnderstanding'
] as const;
export type DimensionName = (typeof DIMENSION_NAMES)[number];

const dim = z.number().min(0).max(10);
export const DimensionScoresSchema = z.object({
  technicalCorrectness: dim,
  relevance: dim,
  completeness: dim,
  clarity: dim,
  communication: dim,
  depth: dim,
  roleUnderstanding: dim
});
export type DimensionScores = z.infer<typeof DimensionScoresSchema>;

/** LLM output for one answer. `score` (if sent) is ignored: the overall score is computed deterministically. */
export const AnswerEvaluationSchema = z.object({
  dimensionScores: DimensionScoresSchema,
  score: z.number().min(0).max(100).optional(),
  reasoning: str(2000).default(''),
  strengths: strList(8),
  weaknesses: strList(8),
  missingConcepts: strList(10),
  improvedAnswerOutline: strList(10, 500),
  topicsToRevise: strList(10)
});
export type AnswerEvaluation = z.infer<typeof AnswerEvaluationSchema>;

export const ReportNarrativeSchema = z.object({
  narrative: str(3000).min(1)
});

export const FinalReportSchema = z.object({
  overallScore: z.number().min(0).max(100).nullable(),
  averageByCategory: z.record(z.number()),
  averageByDimension: z.record(z.number()).optional(),
  counts: z.object({
    totalQuestions: z.number().int(),
    answered: z.number().int(),
    unanswered: z.number().int(),
    evaluated: z.number().int(),
    answeredNotEvaluated: z.number().int(),
    practiceQuestions: z.number().int()
  }),
  scoringNote: z.string(),
  summary: z.string(),
  narrative: z.string().nullable(),
  narrativeNote: z.string().nullable(),
  topStrengths: z.array(z.string()),
  areasToImprove: z.array(z.string()),
  topicsToRevise: z.array(z.string()),
  perQuestion: z.array(
    z.object({
      questionId: z.string(),
      order: z.number().int(),
      category: z.string().nullable(),
      difficulty: z.string().nullable(),
      source: z.string(),
      questionText: z.string(),
      answered: z.boolean(),
      evaluated: z.boolean(),
      score: z.number().nullable(),
      feedback: z.string().nullable()
    })
  ),
  generatedAt: z.string(),
  disclaimer: z.literal(INTERVIEW_DISCLAIMER)
});
export type FinalReport = z.infer<typeof FinalReportSchema>;
