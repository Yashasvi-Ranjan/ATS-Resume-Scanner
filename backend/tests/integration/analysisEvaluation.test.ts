import request from 'supertest';
import { createApp } from '../../src/app';
import prisma from '../../src/config/prisma';
import { AnalysisService } from '../../src/services/analysis.service';
import { ApiError } from '../../src/utils/apiError';

const app = createApp();
const MISSING_UUID = '00000000-0000-4000-8000-000000000000';

describe('Integration Tests: AnalysisService.recordAnalysisEvaluation (internal only)', () => {
  let token: string;
  let analysisId: string;
  const call = (id: string, evaluation: unknown) =>
    AnalysisService.recordAnalysisEvaluation(id, evaluation);

  const expectUnchanged = async () => {
    const row = await prisma.jobAnalysis.findUniqueOrThrow({ where: { id: analysisId } });
    expect(row.status).toBe('PENDING');
    expect(row.overallScore).toBeNull();
    expect(row.skillsScore).toBeNull();
    expect(row.strengths).toEqual([]);
    expect(row.weaknesses).toEqual([]);
    expect(row.suggestions).toEqual([]);
    expect(row.missingSkills).toEqual([]);
  };

  beforeAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE users CASCADE;');
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Eval User', email: 'eval.user@example.com', password: 'Password123!' });
    token = reg.body.data.token;

    const resumeRes = await request(app)
      .post('/api/v1/resumes')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', Buffer.from('%PDF-1.4 Test Resume'), {
        filename: 'eval-resume.pdf',
        contentType: 'application/pdf'
      });
    const jdRes = await request(app)
      .post('/api/v1/job-descriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Dev', description: 'Build things.', requiredSkills: ['Node.js'] });

    const res = await request(app)
      .post('/api/v1/analyses')
      .set('Authorization', `Bearer ${token}`)
      .send({ resumeId: resumeRes.body.data.id, jobDescriptionId: jdRes.body.data.id });
    expect(res.status).toBe(201);
    analysisId = res.body.data.id;
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE users CASCADE;');
  });

  it('rejects invalid input with a 400 ApiError and leaves the row unchanged', async () => {
    const bad: unknown[] = [
      { overallScore: 150 },
      { overallScore: -1 },
      { foo: 'bar' },
      { status: 'BOGUS' },
      { strengths: 'not-an-array' }
    ];
    for (const evaluation of bad) {
      const err = await call(analysisId, evaluation).then(
        () => null,
        (e: unknown) => e
      );
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).statusCode).toBe(400);
    }
    await expectUnchanged();
  });

  it('throws 404 for an unknown analysis id', async () => {
    const err = await call(MISSING_UUID, { overallScore: 10 }).then(
      () => null,
      (e: unknown) => e
    );
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).statusCode).toBe(404);
    expect((err as ApiError).message).toContain('Job analysis record not found');
  });

  it('updates only the provided fields', async () => {
    await call(analysisId, { status: 'COMPLETED', overallScore: 75, strengths: ['x'] });

    const row = await prisma.jobAnalysis.findUniqueOrThrow({ where: { id: analysisId } });
    expect(row.status).toBe('COMPLETED');
    expect(row.overallScore).toBe(75);
    expect(row.strengths).toEqual(['x']);
    expect(row.skillsScore).toBeNull();
    expect(row.experienceScore).toBeNull();
    expect(row.keywordsScore).toBeNull();
    expect(row.educationScore).toBeNull();
    expect(row.projectRelevanceScore).toBeNull();
    expect(row.weaknesses).toEqual([]);
    expect(row.suggestions).toEqual([]);
    expect(row.missingSkills).toEqual([]);
  });

  describe('no HTTP route exposes evaluation', () => {
    const evaluation = { status: 'COMPLETED', overallScore: 100, strengths: ['hacked'] };

    it.each(['patch', 'put'] as const)('%s /api/v1/analyses/:id is not routed (404)', async (method) => {
      const res = await (request(app) as any)[method](`/api/v1/analyses/${analysisId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(evaluation);
      expect(res.status).toBe(404);

      const row = await prisma.jobAnalysis.findUniqueOrThrow({ where: { id: analysisId } });
      expect(row.overallScore).not.toBe(100);
      expect(row.strengths).not.toContain('hacked');
    });
  });
});
