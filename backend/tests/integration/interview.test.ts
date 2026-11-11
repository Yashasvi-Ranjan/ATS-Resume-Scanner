import request from 'supertest';
import { createApp } from '../../src/app';
import prisma from '../../src/config/prisma';

const app = createApp();

describe('Integration Tests: Mock Interview Sessions, Answers & Reports', () => {
  let userAToken: string;
  let userBToken: string;
  let resumeId: string;
  let jobDescriptionId: string;
  let sessionId: string;
  let questionId: string;
  let answerId: string;

  beforeAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE users CASCADE;');

    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Interview User A',
        email: 'interview.userA@example.com',
        password: 'Password123!'
      });
    userAToken = resA.body.data.token;

    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Interview User B',
        email: 'interview.userB@example.com',
        password: 'Password123!'
      });
    userBToken = resB.body.data.token;

    const resumeRes = await request(app)
      .post('/api/v1/resumes')
      .set('Authorization', `Bearer ${userAToken}`)
      .attach('resume', Buffer.from('%PDF-1.4 Mock CV'), {
        filename: 'interview-candidate.pdf',
        contentType: 'application/pdf'
      });
    resumeId = resumeRes.body.data.id;

    const jdRes = await request(app)
      .post('/api/v1/job-descriptions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Backend Specialist',
        description: 'Design and optimize backend database queries and APIs.',
        requiredSkills: ['Node.js', 'PostgreSQL', 'System Design']
      });
    jobDescriptionId = jdRes.body.data.id;
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE users CASCADE;');
  });

  describe('POST /api/v1/interviews & Session Lifecycle', () => {
    it('should create an interview session in SCHEDULED status', async () => {
      const res = await request(app)
        .post('/api/v1/interviews')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          resumeId,
          jobDescriptionId,
          totalQuestions: 5
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SCHEDULED');
      expect(res.body.data.totalQuestions).toBe(5);

      sessionId = res.body.data.id;
    });

    it('should add interview questions to the session', async () => {
      const questionPayload = {
        questionText: 'Can you explain the differences between clustered and non-clustered indexing in PostgreSQL?',
        order: 1,
        category: 'Database'
      };

      const res = await request(app)
        .post(`/api/v1/interviews/${sessionId}/questions`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send(questionPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.questionText).toBe(questionPayload.questionText);
      expect(res.body.data.order).toBe(1);

      questionId = res.body.data.id;
    });

    it('should submit an answer to the question and transition session to IN_PROGRESS', async () => {
      const answerPayload = {
        questionId,
        answerText: 'A clustered index determines the physical order of data in the table, while a non-clustered index creates a separate structure pointing to the actual data rows.'
      };

      const res = await request(app)
        .post(`/api/v1/interviews/${sessionId}/answers`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send(answerPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.answerText).toBe(answerPayload.answerText);
      expect(res.body.data).toHaveProperty('submittedAt');

      answerId = res.body.data.id;

      // Verify session is now IN_PROGRESS
      const sessionCheck = await request(app)
        .get(`/api/v1/interviews/${sessionId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(sessionCheck.body.data.status).toBe('IN_PROGRESS');
    });

    it('should reject duplicate answers to the same question (409 Conflict)', async () => {
      const duplicatePayload = {
        questionId,
        answerText: 'Attempting to resubmit answer to the same question.'
      };

      const res = await request(app)
        .post(`/api/v1/interviews/${sessionId}/answers`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send(duplicatePayload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should allow updating an answer when session is active', async () => {
      const updatedText = 'Updated response: Clustered indexes order table data rows physically. Non-clustered indexes maintain a sorted key list with pointers.';

      const res = await request(app)
        .patch(`/api/v1/interviews/${sessionId}/answers/${answerId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ answerText: updatedText });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.answerText).toBe(updatedText);
    });

    it('should attach a mock evaluation to the question', async () => {
      const evalPayload = {
        questionId,
        score: 88.5,
        feedback: 'Clear explanation of index structures with good practical examples.',
        isMock: true
      };

      const res = await request(app)
        .post(`/api/v1/interviews/${sessionId}/evaluations`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send(evalPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.score).toBe(88.5);
      expect(res.body.data.isMock).toBe(true);
    });

    it('should update interview session status to COMPLETED', async () => {
      const res = await request(app)
        .patch(`/api/v1/interviews/${sessionId}/status`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('COMPLETED');
    });

    it('should prevent answer modifications after session is COMPLETED (400 Bad Request)', async () => {
      const res = await request(app)
        .patch(`/api/v1/interviews/${sessionId}/answers/${answerId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ answerText: 'Trying to change answer after completion' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should retrieve full interview session report with metrics and Q&A breakdown', async () => {
      const res = await request(app)
        .get(`/api/v1/interviews/${sessionId}/report`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics.answeredCount).toBe(1);
      expect(res.body.data.metrics.evaluatedCount).toBe(1);
      expect(res.body.data.metrics.averageScore).toBe(88.5);
      expect(Array.isArray(res.body.data.qaBreakdown)).toBe(true);
      expect(res.body.data.qaBreakdown[0].questionText).toContain('indexing');
      expect(res.body.data.qaBreakdown[0].answer).not.toBeNull();
      expect(res.body.data.qaBreakdown[0].evaluation).not.toBeNull();
    });

    it('should prevent User B from accessing User A interview report (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/interviews/${sessionId}/report`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
