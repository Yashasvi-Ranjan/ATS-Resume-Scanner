import { AnalysisStatus, InterviewStatus, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { AiError, aiLog, getLlmService, safeErrorMessage, toApiError } from '../ai/llm';
import { ensureResumeParsed } from '../ai/resume';
import { ensureJdParsed, getEffectiveJdData } from '../ai/jd';
import { MatchResult, MatchResultSchema } from '../ai/schemas/match.schema';
import { InterviewDifficultySetting } from '../ai/schemas/interview.schema';
import { InterviewContext } from '../ai/interview/context';
import { InterviewGenerator } from '../ai/interview/generator';
import { AnswerEvaluator, EvaluationOutcome } from '../ai/interview/evaluator';
import { ReportGenerator, ReportQuestion } from '../ai/interview/report';

export interface CreateInterviewDTO {
  resumeId: string;
  jobDescriptionId: string;
  analysisId?: string | null;
  totalQuestions?: number;
  difficulty?: InterviewDifficultySetting;
  generate?: boolean;
}

export interface AddQuestionDTO {
  questionText: string;
  order: number;
  category?: string | null;
}

export interface SubmitAnswerDTO {
  questionId: string;
  answerText: string;
}

export type EvaluationStatus = 'EVALUATED' | 'FAILED' | 'SKIPPED' | 'NOT_APPLICABLE';

/** Generation that stays PROCESSING longer than this is considered abandoned and may be re-claimed. */
export const GENERATION_STALE_MS = 5 * 60 * 1000;

/** In-process guard against concurrent double evaluation of the same answer. */
const evaluating = new Set<string>();

const isClosed = (s: InterviewStatus) => s === InterviewStatus.COMPLETED || s === InterviewStatus.ABANDONED;

function failureText(err: unknown): string {
  if (err instanceof ApiError) return err.isOperational ? err.message : 'Operation failed unexpectedly';
  if (err instanceof AiError) return safeErrorMessage(err);
  return 'Operation failed unexpectedly';
}

export class InterviewService {
  // ---------------------------------------------------------------- sessions
  static async createSession(userId: string, data: CreateInterviewDTO) {
    const resume = await prisma.resume.findUnique({ where: { id: data.resumeId } });
    if (!resume) throw ApiError.notFound('Resume not found');
    if (resume.userId !== userId) throw ApiError.forbidden('You do not own the specified resume');

    const jobDescription = await prisma.jobDescription.findUnique({ where: { id: data.jobDescriptionId } });
    if (!jobDescription) throw ApiError.notFound('Job description not found');
    if (jobDescription.userId !== userId) throw ApiError.forbidden('You do not own the specified job description');

    if (data.analysisId) {
      const analysis = await prisma.jobAnalysis.findUnique({ where: { id: data.analysisId } });
      if (!analysis) throw ApiError.notFound('Analysis record not found');
      if (analysis.userId !== userId) throw ApiError.forbidden('You do not own the specified analysis record');
    }

    const session = await prisma.interviewSession.create({
      data: {
        userId,
        resumeId: data.resumeId,
        jobDescriptionId: data.jobDescriptionId,
        analysisId: data.analysisId || null,
        totalQuestions: data.totalQuestions || 5,
        difficulty: data.difficulty ?? 'mixed',
        status: InterviewStatus.SCHEDULED
      },
      include: {
        resume: { select: { id: true, originalFilename: true } },
        jobDescription: { select: { id: true, title: true, companyName: true } }
      }
    });

    if (!data.generate) return session;

    // The session is kept even when generation fails (generationStatus FAILED + errorMessage; retry via generate-questions).
    try {
      await InterviewService.generateQuestions(userId, session.id);
    } catch (err) {
      aiLog.error({ event: 'interview.create.generate_failed', task: 'interview_questions' });
      void err;
    }
    return InterviewService.getSessionById(userId, session.id);
  }

  static async listUserSessions(
    userId: string,
    queryParams: { page?: unknown; limit?: unknown; status?: unknown }
  ) {
    const { page, limit, skip } = parsePagination(queryParams);
    const statusFilter = queryParams.status ? (String(queryParams.status) as InterviewStatus) : undefined;
    const where = { userId, ...(statusFilter && { status: statusFilter }) };

    const [total, sessions] = await Promise.all([
      prisma.interviewSession.count({ where }),
      prisma.interviewSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          resume: { select: { id: true, originalFilename: true } },
          jobDescription: { select: { id: true, title: true, companyName: true } },
          _count: { select: { questions: true, answers: true } }
        }
      })
    ]);

    return { sessions, meta: buildPaginationMeta(total, page, limit) };
  }

  /** Ownership-checked session with questions/answers/evaluations and resume-where-you-left-off progress. */
  static async getSessionById(userId: string, sessionId: string) {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        resume: { select: { id: true, originalFilename: true } },
        jobDescription: { select: { id: true, title: true, companyName: true } },
        analysis: { select: { id: true, status: true, overallScore: true } },
        questions: { orderBy: { order: 'asc' }, include: { answer: true, evaluation: true } }
      }
    });
    if (!session) throw ApiError.notFound('Interview session not found');
    if (session.userId !== userId) {
      throw ApiError.forbidden('You do not have permission to access this interview session');
    }
    const answered = session.questions.filter((q) => q.answer !== null).length;
    const next = session.questions.find((q) => q.answer === null);
    return {
      ...session,
      progress: { answered, total: session.questions.length, nextQuestionId: next ? next.id : null }
    };
  }

  // ----------------------------------------------------------- generation
  private static async loadMatch(
    userId: string,
    session: { analysisId: string | null; resumeId: string; jobDescriptionId: string }
  ): Promise<MatchResult | null> {
    const analysis = session.analysisId
      ? await prisma.jobAnalysis.findFirst({
          where: { id: session.analysisId, userId, status: AnalysisStatus.COMPLETED }
        })
      : await prisma.jobAnalysis.findFirst({
          where: {
            userId,
            resumeId: session.resumeId,
            jobDescriptionId: session.jobDescriptionId,
            status: AnalysisStatus.COMPLETED,
            resultData: { not: Prisma.DbNull }
          },
          orderBy: { createdAt: 'desc' }
        });
    if (!analysis?.resultData) return null;
    const parsed = MatchResultSchema.safeParse(analysis.resultData);
    return parsed.success ? parsed.data : null;
  }

  /**
   * Generate AI questions for a session. Idempotent: existing questions are returned unchanged unless the
   * session has no answers and `regenerate` is true. On failure the session is marked FAILED (retryable) and
   * the error is thrown; no partial question set is ever stored.
   */
  static async generateQuestions(userId: string, sessionId: string, opts: { regenerate?: boolean } = {}) {
    const session = await InterviewService.getSessionById(userId, sessionId);
    if (isClosed(session.status)) {
      throw ApiError.badRequest(`Cannot generate questions for an interview session that is ${session.status.toLowerCase()}`);
    }
    const hasQuestions = session.questions.length > 0;
    const hasAnswers = session.questions.some((q) => q.answer !== null);
    if (hasQuestions && !opts.regenerate) {
      return { generated: false, generationStatus: session.generationStatus, questions: session.questions };
    }
    if (hasQuestions && hasAnswers) {
      throw ApiError.conflict('Questions cannot be regenerated after answers have been submitted');
    }

    const claim = await prisma.interviewSession.updateMany({
      where: {
        id: sessionId,
        OR: [
          { generationStatus: { not: AnalysisStatus.PROCESSING } },
          { updatedAt: { lt: new Date(Date.now() - GENERATION_STALE_MS) } }
        ]
      },
      data: { generationStatus: AnalysisStatus.PROCESSING, errorMessage: null }
    });
    if (claim.count === 0) throw ApiError.conflict('Question generation is already in progress');

    try {
      const { resume, data: resumeData } = await ensureResumeParsed(userId, session.resumeId);
      void resume;
      const jd = await ensureJdParsed(userId, session.jobDescriptionId);
      const ctx: InterviewContext = {
        resume: resumeData,
        jd: getEffectiveJdData(jd),
        jobTitle: jd.title,
        match: await InterviewService.loadMatch(userId, session)
      };
      const difficulty = (session.difficulty as InterviewDifficultySetting | null) ?? 'mixed';
      const result = await new InterviewGenerator(getLlmService()).generate(ctx, {
        count: session.totalQuestions,
        difficulty
      });

      await prisma.$transaction(async (tx) => {
        if (hasQuestions) await tx.interviewQuestion.deleteMany({ where: { sessionId } });
        await tx.interviewQuestion.createMany({
          data: result.questions.map((q, i) => ({
            sessionId,
            questionText: q.questionText,
            order: i + 1,
            category: q.category,
            difficulty: q.difficulty,
            rationale: q.rationale,
            expectedTopics: q.expectedTopics,
            source: 'AI'
          }))
        });
        await tx.interviewSession.update({
          where: { id: sessionId },
          data: { generationStatus: AnalysisStatus.COMPLETED, errorMessage: null, modelInfo: result.modelInfo }
        });
      });

      const fresh = await InterviewService.getSessionById(userId, sessionId);
      return { generated: true, generationStatus: fresh.generationStatus, questions: fresh.questions };
    } catch (err) {
      await prisma.interviewSession
        .update({
          where: { id: sessionId },
          data: { generationStatus: AnalysisStatus.FAILED, errorMessage: failureText(err) }
        })
        .catch(() => undefined);
      throw toApiError(err);
    }
  }

  // ---------------------------------------------------------- user questions
  /** Adds a user-authored PRACTICE question (source 'USER'): never AI-evaluated, excluded from report averages. */
  static async addQuestion(userId: string, sessionId: string, data: AddQuestionDTO) {
    const session = await InterviewService.getSessionById(userId, sessionId);
    if (isClosed(session.status)) {
      throw ApiError.badRequest(`Cannot add questions to an interview session that is ${session.status.toLowerCase()}`);
    }
    return prisma.interviewQuestion.create({
      data: {
        sessionId,
        questionText: data.questionText,
        order: data.order,
        category: data.category,
        source: 'USER'
      }
    });
  }

  // ----------------------------------------------------------------- answers
  static async submitAnswer(userId: string, sessionId: string, data: SubmitAnswerDTO, evaluate = true) {
    const session = await InterviewService.getSessionById(userId, sessionId);
    if (isClosed(session.status)) {
      throw ApiError.badRequest(`Cannot submit answers to an interview session that is ${session.status.toLowerCase()}`);
    }

    const question = await prisma.interviewQuestion.findUnique({ where: { id: data.questionId } });
    if (!question || question.sessionId !== sessionId) {
      throw ApiError.notFound('Question not found in this interview session');
    }
    const existing = await prisma.interviewAnswer.findUnique({ where: { questionId: data.questionId } });
    if (existing) {
      throw ApiError.conflict('An answer has already been submitted for this question. Use update answer instead.');
    }

    let answer;
    try {
      answer = await prisma.interviewAnswer.create({
        data: { sessionId, questionId: data.questionId, answerText: data.answerText, submittedAt: new Date() }
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw ApiError.conflict('An answer has already been submitted for this question. Use update answer instead.');
      }
      throw err;
    }

    if (session.status === InterviewStatus.SCHEDULED) {
      await prisma.interviewSession.update({ where: { id: sessionId }, data: { status: InterviewStatus.IN_PROGRESS } });
    }

    return InterviewService.withEvaluation(userId, sessionId, answer.id, evaluate);
  }

  static async updateAnswer(
    userId: string,
    sessionId: string,
    answerId: string,
    answerText: string,
    evaluate = true
  ) {
    const session = await InterviewService.getSessionById(userId, sessionId);
    if (isClosed(session.status)) {
      throw ApiError.badRequest(`Cannot update answers for an interview session that is ${session.status.toLowerCase()}`);
    }
    const answer = await prisma.interviewAnswer.findUnique({ where: { id: answerId } });
    if (!answer || answer.sessionId !== sessionId) {
      throw ApiError.notFound('Interview answer not found in this session');
    }

    // Editing invalidates the previous evaluation (it scored different text).
    await prisma.$transaction([
      prisma.interviewAnswer.update({ where: { id: answerId }, data: { answerText, submittedAt: new Date() } }),
      prisma.interviewEvaluation.deleteMany({ where: { questionId: answer.questionId } })
    ]);

    return InterviewService.withEvaluation(userId, sessionId, answerId, evaluate);
  }

  /** Returns the answer plus {evaluation, evaluationStatus, evaluationError}; an evaluation failure never loses the answer. */
  private static async withEvaluation(userId: string, sessionId: string, answerId: string, evaluate: boolean) {
    const answer = await prisma.interviewAnswer.findUniqueOrThrow({ where: { id: answerId }, include: { question: true } });
    const { question, ...answerFields } = answer;
    if (!evaluate) {
      return { ...answerFields, evaluation: null, evaluationStatus: 'SKIPPED' as EvaluationStatus, evaluationError: null };
    }
    if (question.source === 'USER') {
      return { ...answerFields, evaluation: null, evaluationStatus: 'NOT_APPLICABLE' as EvaluationStatus, evaluationError: null };
    }
    try {
      const evaluation = await InterviewService.runEvaluation(userId, sessionId, answerId);
      return { ...answerFields, evaluation, evaluationStatus: 'EVALUATED' as EvaluationStatus, evaluationError: null };
    } catch (err) {
      return {
        ...answerFields,
        evaluation: null,
        evaluationStatus: 'FAILED' as EvaluationStatus,
        evaluationError: failureText(err)
      };
    }
  }

  /** POST /:id/answers/:answerId/evaluate: (re-)evaluate; errors are returned to the caller. */
  static async evaluateAnswerById(userId: string, sessionId: string, answerId: string) {
    const session = await InterviewService.getSessionById(userId, sessionId);
    if (isClosed(session.status)) {
      throw ApiError.badRequest(`Cannot evaluate answers in an interview session that is ${session.status.toLowerCase()}`);
    }
    const answer = await prisma.interviewAnswer.findUnique({ where: { id: answerId }, include: { question: true } });
    if (!answer || answer.sessionId !== sessionId) {
      throw ApiError.notFound('Interview answer not found in this session');
    }
    if (answer.question.source === 'USER') {
      throw ApiError.badRequest('Practice questions written by you are not evaluated');
    }
    return InterviewService.runEvaluation(userId, sessionId, answerId);
  }

  /**
   * The ONLY writer of InterviewEvaluation. Throws on LLM failure and persists nothing in that case.
   * Guarded against concurrent evaluation of the same answer and against the answer changing mid-evaluation.
   */
  private static async runEvaluation(userId: string, sessionId: string, answerId: string) {
    if (evaluating.has(answerId)) throw ApiError.conflict('This answer is already being evaluated');
    evaluating.add(answerId);
    try {
      const answer = await prisma.interviewAnswer.findUnique({ where: { id: answerId }, include: { question: true } });
      if (!answer || answer.sessionId !== sessionId) throw ApiError.notFound('Interview answer not found in this session');
      const session = await prisma.interviewSession.findUniqueOrThrow({
        where: { id: sessionId },
        include: { jobDescription: true }
      });
      if (session.userId !== userId) throw ApiError.forbidden('You do not have permission to access this interview session');
      const q = answer.question;

      const outcome: EvaluationOutcome = await new AnswerEvaluator(getLlmService()).evaluate({
        question: { questionText: q.questionText, category: q.category, expectedTopics: q.expectedTopics },
        jd: getEffectiveJdData(session.jobDescription),
        jobTitle: session.jobDescription.title,
        answerText: answer.answerText
      });

      const current = await prisma.interviewAnswer.findUnique({ where: { id: answerId } });
      if (!current || current.answerText !== answer.answerText) {
        throw ApiError.conflict('The answer was changed while it was being evaluated. Please evaluate again.');
      }

      const payload = {
        score: outcome.score,
        feedback: outcome.feedback,
        isMock: false,
        details: outcome.details as unknown as Prisma.InputJsonValue,
        modelInfo: outcome.modelInfo,
        evaluatedAt: new Date()
      };
      return await prisma.interviewEvaluation.upsert({
        where: { questionId: q.id },
        update: payload,
        create: { questionId: q.id, ...payload }
      });
    } catch (err) {
      throw toApiError(err);
    } finally {
      evaluating.delete(answerId);
    }
  }

  // ------------------------------------------------------------------ status
  static async updateStatus(userId: string, sessionId: string, status: InterviewStatus) {
    const session = await InterviewService.getSessionById(userId, sessionId);
    if (status === 'COMPLETED' && session.status !== 'COMPLETED') {
      throw ApiError.badRequest('Interviews cannot be completed through this endpoint; use POST /interviews/:id/complete so the report is generated');
    }
    if (isClosed(session.status) && status !== session.status) {
      throw ApiError.conflict(`Interview session is already ${session.status.toLowerCase()}`);
    }
    return prisma.interviewSession.update({ where: { id: sessionId }, data: { status } });
  }

  // ------------------------------------------------------- complete + report
  private static toReportQuestions(
    questions: Awaited<ReturnType<typeof InterviewService.getSessionById>>['questions']
  ): ReportQuestion[] {
    return questions.map((q) => ({
      id: q.id,
      order: q.order,
      category: q.category,
      difficulty: q.difficulty,
      source: q.source,
      questionText: q.questionText,
      answer: q.answer ? { id: q.answer.id, answerText: q.answer.answerText } : null,
      evaluation: q.evaluation
        ? { score: q.evaluation.score, feedback: q.evaluation.feedback, details: q.evaluation.details }
        : null
    }));
  }

  /** Validate, (best-effort) evaluate pending answers, build + persist the report, mark COMPLETED. */
  static async completeSession(userId: string, sessionId: string) {
    let session = await InterviewService.getSessionById(userId, sessionId);
    if (isClosed(session.status)) {
      throw ApiError.conflict(`Interview session is already ${session.status.toLowerCase()}`);
    }
    if (!session.questions.some((q) => q.answer !== null)) {
      throw ApiError.badRequest('Answer at least one question before completing the interview');
    }

    // Retry evaluation for AI-question answers that have none yet (e.g. LLM was down earlier). Failures are tolerated.
    for (const q of session.questions) {
      if (q.answer && !q.evaluation && q.source !== 'USER') {
        try {
          await InterviewService.runEvaluation(userId, sessionId, q.answer.id);
        } catch {
          /* stays unevaluated; reported honestly in counts.answeredNotEvaluated */
        }
      }
    }
    session = await InterviewService.getSessionById(userId, sessionId);

    let llm = null;
    try {
      const svc = getLlmService();
      llm = svc.isConfigured ? svc : null;
    } catch {
      llm = null;
    }
    const { report, modelInfo } = await new ReportGenerator(llm).generate(
      InterviewService.toReportQuestions(session.questions),
      session.jobDescription.title
    );

    const claimed = await prisma.interviewSession.updateMany({
      where: { id: sessionId, status: { in: [InterviewStatus.SCHEDULED, InterviewStatus.IN_PROGRESS] } },
      data: {
        status: InterviewStatus.COMPLETED,
        reportData: report as unknown as Prisma.InputJsonValue,
        reportGeneratedAt: new Date(),
        ...(modelInfo ? { modelInfo } : {})
      }
    });
    if (claimed.count === 0) throw ApiError.conflict('Interview session is already completed');

    return { id: sessionId, status: InterviewStatus.COMPLETED, reportGeneratedAt: new Date(), report };
  }

  static async getInterviewReport(userId: string, sessionId: string) {
    const session = await InterviewService.getSessionById(userId, sessionId);

    const totalQuestions = session.questions.length;
    const answeredQuestions = session.questions.filter((q) => q.answer !== null).length;
    const evaluatedQuestions = session.questions.filter((q) => q.evaluation !== null);
    const scores = evaluatedQuestions
      .map((q) => q.evaluation?.score)
      .filter((s): s is number => typeof s === 'number');
    const averageScore =
      scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : null;

    const persisted = session.status === InterviewStatus.COMPLETED && session.reportData != null;
    const report = persisted
      ? session.reportData
      : ReportGenerator.aggregate(InterviewService.toReportQuestions(session.questions));

    return {
      session: {
        id: session.id,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        resume: session.resume,
        jobDescription: session.jobDescription
      },
      persisted,
      reportGeneratedAt: persisted ? session.reportGeneratedAt : null,
      report,
      metrics: {
        configuredTotalQuestions: session.totalQuestions,
        actualQuestionsCount: totalQuestions,
        answeredCount: answeredQuestions,
        evaluatedCount: evaluatedQuestions.length,
        averageScore,
        isMockEvaluation: evaluatedQuestions.some((q) => q.evaluation?.isMock)
      },
      qaBreakdown: session.questions.map((q) => ({
        id: q.id,
        order: q.order,
        category: q.category,
        difficulty: q.difficulty,
        source: q.source,
        questionText: q.questionText,
        answer: q.answer
          ? { id: q.answer.id, answerText: q.answer.answerText, submittedAt: q.answer.submittedAt }
          : null,
        evaluation: q.evaluation
          ? {
              score: q.evaluation.score,
              feedback: q.evaluation.feedback,
              isMock: q.evaluation.isMock,
              details: q.evaluation.details,
              evaluatedAt: q.evaluation.evaluatedAt
            }
          : null
      }))
    };
  }
}
