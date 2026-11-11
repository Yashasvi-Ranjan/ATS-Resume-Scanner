import { InterviewStatus } from '@prisma/client';
import prisma from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

export interface CreateInterviewDTO {
  resumeId: string;
  jobDescriptionId: string;
  analysisId?: string | null;
  totalQuestions?: number;
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

export interface AddEvaluationDTO {
  questionId: string;
  score?: number | null;
  feedback?: string | null;
  isMock?: boolean;
}

export class InterviewService {
  static async createSession(userId: string, data: CreateInterviewDTO) {
    // 1. Verify resume
    const resume = await prisma.resume.findUnique({
      where: { id: data.resumeId }
    });
    if (!resume) {
      throw ApiError.notFound('Resume not found');
    }
    if (resume.userId !== userId) {
      throw ApiError.forbidden('You do not own the specified resume');
    }

    // 2. Verify job description
    const jobDescription = await prisma.jobDescription.findUnique({
      where: { id: data.jobDescriptionId }
    });
    if (!jobDescription) {
      throw ApiError.notFound('Job description not found');
    }
    if (jobDescription.userId !== userId) {
      throw ApiError.forbidden('You do not own the specified job description');
    }

    // 3. Optional analysis verify
    if (data.analysisId) {
      const analysis = await prisma.jobAnalysis.findUnique({
        where: { id: data.analysisId }
      });
      if (!analysis) {
        throw ApiError.notFound('Analysis record not found');
      }
      if (analysis.userId !== userId) {
        throw ApiError.forbidden('You do not own the specified analysis record');
      }
    }

    const session = await prisma.interviewSession.create({
      data: {
        userId,
        resumeId: data.resumeId,
        jobDescriptionId: data.jobDescriptionId,
        analysisId: data.analysisId || null,
        totalQuestions: data.totalQuestions || 5,
        status: InterviewStatus.SCHEDULED
      },
      include: {
        resume: { select: { id: true, originalFilename: true } },
        jobDescription: { select: { id: true, title: true, companyName: true } }
      }
    });

    return session;
  }

  static async listUserSessions(
    userId: string,
    queryParams: { page?: unknown; limit?: unknown; status?: unknown }
  ) {
    const { page, limit, skip } = parsePagination(queryParams);
    const statusFilter = queryParams.status
      ? (String(queryParams.status) as InterviewStatus)
      : undefined;

    const where = {
      userId,
      ...(statusFilter && { status: statusFilter })
    };

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

    const meta = buildPaginationMeta(total, page, limit);
    return { sessions, meta };
  }

  static async getSessionById(userId: string, sessionId: string) {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        resume: { select: { id: true, originalFilename: true } },
        jobDescription: { select: { id: true, title: true, companyName: true } },
        analysis: { select: { id: true, status: true, overallScore: true } },
        questions: {
          orderBy: { order: 'asc' },
          include: {
            answer: true,
            evaluation: true
          }
        }
      }
    });

    if (!session) {
      throw ApiError.notFound('Interview session not found');
    }

    if (session.userId !== userId) {
      throw ApiError.forbidden('You do not have permission to access this interview session');
    }

    return session;
  }

  static async addQuestion(userId: string, sessionId: string, data: AddQuestionDTO) {
    const session = await this.getSessionById(userId, sessionId);

    if (session.status === InterviewStatus.COMPLETED || session.status === InterviewStatus.ABANDONED) {
      throw ApiError.badRequest(`Cannot add questions to an interview session that is ${session.status.toLowerCase()}`);
    }

    const question = await prisma.interviewQuestion.create({
      data: {
        sessionId,
        questionText: data.questionText,
        order: data.order,
        category: data.category
      }
    });

    return question;
  }

  static async submitAnswer(userId: string, sessionId: string, data: SubmitAnswerDTO) {
    const session = await this.getSessionById(userId, sessionId);

    if (session.status === InterviewStatus.COMPLETED || session.status === InterviewStatus.ABANDONED) {
      throw ApiError.badRequest(`Cannot submit answers to an interview session that is ${session.status.toLowerCase()}`);
    }

    // Verify question belongs to this session
    const question = await prisma.interviewQuestion.findUnique({
      where: { id: data.questionId }
    });

    if (!question || question.sessionId !== sessionId) {
      throw ApiError.notFound('Question not found in this interview session');
    }

    // Check if answer already exists
    const existing = await prisma.interviewAnswer.findUnique({
      where: { questionId: data.questionId }
    });

    if (existing) {
      throw ApiError.conflict('An answer has already been submitted for this question. Use update answer instead.');
    }

    const answer = await prisma.interviewAnswer.create({
      data: {
        sessionId,
        questionId: data.questionId,
        answerText: data.answerText,
        submittedAt: new Date()
      }
    });

    // Automatically transition to IN_PROGRESS if SCHEDULED
    if (session.status === InterviewStatus.SCHEDULED) {
      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: { status: InterviewStatus.IN_PROGRESS }
      });
    }

    return answer;
  }

  static async updateAnswer(
    userId: string,
    sessionId: string,
    answerId: string,
    answerText: string
  ) {
    const session = await this.getSessionById(userId, sessionId);

    if (session.status === InterviewStatus.COMPLETED || session.status === InterviewStatus.ABANDONED) {
      throw ApiError.badRequest(`Cannot update answers for an interview session that is ${session.status.toLowerCase()}`);
    }

    const answer = await prisma.interviewAnswer.findUnique({
      where: { id: answerId }
    });

    if (!answer || answer.sessionId !== sessionId) {
      throw ApiError.notFound('Interview answer not found in this session');
    }

    const updated = await prisma.interviewAnswer.update({
      where: { id: answerId },
      data: {
        answerText,
        submittedAt: new Date()
      }
    });

    return updated;
  }

  static async updateStatus(userId: string, sessionId: string, status: InterviewStatus) {
    await this.getSessionById(userId, sessionId);

    const updated = await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { status }
    });

    return updated;
  }

  static async addEvaluation(userId: string, sessionId: string, data: AddEvaluationDTO) {
    await this.getSessionById(userId, sessionId);

    const question = await prisma.interviewQuestion.findUnique({
      where: { id: data.questionId }
    });

    if (!question || question.sessionId !== sessionId) {
      throw ApiError.notFound('Question not found in this interview session');
    }

    const evaluation = await prisma.interviewEvaluation.upsert({
      where: { questionId: data.questionId },
      update: {
        score: data.score,
        feedback: data.feedback,
        isMock: data.isMock ?? true,
        evaluatedAt: new Date()
      },
      create: {
        questionId: data.questionId,
        score: data.score,
        feedback: data.feedback,
        isMock: data.isMock ?? true,
        evaluatedAt: new Date()
      }
    });

    return evaluation;
  }

  static async getInterviewReport(userId: string, sessionId: string) {
    const session = await this.getSessionById(userId, sessionId);

    const totalQuestions = session.questions.length;
    const answeredQuestions = session.questions.filter((q) => q.answer !== null).length;
    const evaluatedQuestions = session.questions.filter((q) => q.evaluation !== null);

    const scores = evaluatedQuestions
      .map((q) => q.evaluation?.score)
      .filter((s): s is number => typeof s === 'number');

    const averageScore =
      scores.length > 0
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
        : null;

    return {
      session: {
        id: session.id,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        resume: session.resume,
        jobDescription: session.jobDescription
      },
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
        questionText: q.questionText,
        answer: q.answer
          ? {
              id: q.answer.id,
              answerText: q.answer.answerText,
              submittedAt: q.answer.submittedAt
            }
          : null,
        evaluation: q.evaluation
          ? {
              score: q.evaluation.score,
              feedback: q.evaluation.feedback,
              isMock: q.evaluation.isMock,
              evaluatedAt: q.evaluation.evaluatedAt
            }
          : null
      }))
    };
  }
}
