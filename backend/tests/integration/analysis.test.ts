import request from 'supertest';
import { createApp } from '../../src/app';
import prisma from '../../src/config/prisma';

const app = createApp();

const SCORE_FIELDS = [
  'overallScore',
  'skillsScore',
  'experienceScore',
  'keywordsScore',
  'educationScore',
  'projectRelevanceScore'
] as const;
const ARRAY_FIELDS = ['strengths', 'weaknesses', 'suggestions', 'missingSkills'] as const;
const MISSING_UUID = '00000000-0000-4000-8000-000000000000';

describe('Integration Tests: Job Analysis & Recommendations', () => {
  let userAToken: string;
  let userBToken: string;
  let resumeId: string;
  let jobDescriptionId: string;
  let analysisId: string;
  let recommendationId: string;

  beforeAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE users CASCADE;');

    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Analysis User A',
        email: 'analysis.userA@example.com',
        password: 'Password123!'
      });
    userAToken = resA.body.data.token;

    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Analysis User B',
        email: 'analysis.userB@example.com',
        password: 'Password123!'
      });
    userBToken = resB.body.data.token;

    // User A uploads resume
    const resumeRes = await request(app)
      .post('/api/v1/resumes')
      .set('Authorization', `Bearer ${userAToken}`)
      .attach('resume', Buffer.from('%PDF-1.4 Test Resume'), {
        filename: 'my-resume.pdf',
        contentType: 'application/pdf'
      });
    resumeId = resumeRes.body.data.id;

    // User A creates job description
    const jdRes = await request(app)
      .post('/api/v1/job-descriptions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Backend Developer',
        description: 'Building REST APIs using Node and PostgreSQL.',
        requiredSkills: ['Node.js', 'PostgreSQL', 'Express']
      });
    jobDescriptionId = jdRes.body.data.id;
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE users CASCADE;');
  });

  describe('POST /api/v1/analyses', () => {
    it('should create an analysis record in PENDING status without AI scoring', async () => {
      const res = await request(app)
        .post('/api/v1/analyses')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          resumeId,
          jobDescriptionId
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
      for (const field of SCORE_FIELDS) {
        expect(res.body.data[field]).toBeNull();
      }
      for (const field of ARRAY_FIELDS) {
        expect(res.body.data[field]).toEqual([]);
      }
      expect(res.body.data.resumeId).toBe(resumeId);
      expect(res.body.data.jobDescriptionId).toBe(jobDescriptionId);
      expect(res.body.data).toHaveProperty('id');

      analysisId = res.body.data.id;
    });

    it('should prevent User B from creating analysis with User A resume (403 Forbidden)', async () => {
      // User B creates their own job description
      const jdResB = await request(app)
        .post('/api/v1/job-descriptions')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          title: 'Frontend Developer',
          description: 'React developer position.',
          requiredSkills: ['React', 'CSS']
        });

      const res = await request(app)
        .post('/api/v1/analyses')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          resumeId: resumeId, // User A's resume
          jobDescriptionId: jdResB.body.data.id
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('do not own the specified resume');
    });
  });

  describe('POST /analyses lockdown', () => {
    const post = (body: unknown, token: string | null = userAToken) => {
      const req = request(app).post('/api/v1/analyses');
      if (token) req.set('Authorization', `Bearer ${token}`);
      return req.send(body as object);
    };

    const expectRejected = async (body: unknown, mention?: string[]) => {
      const before = await prisma.jobAnalysis.count();
      const res = await post(body);
      const after = await prisma.jobAnalysis.count();

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.length).toBeGreaterThanOrEqual(1);
      if (mention) {
        const text = JSON.stringify(res.body.errors);
        for (const key of mention) expect(text).toContain(key);
      }
      expect(after).toBe(before);
      return res;
    };

    it('rejects status: COMPLETED and persists nothing', async () => {
      await expectRejected({ resumeId, jobDescriptionId, status: 'COMPLETED' }, ['status']);
    });

    it('rejects overallScore: 90', async () => {
      await expectRejected({ resumeId, jobDescriptionId, overallScore: 90 }, ['overallScore']);
    });

    it.each(SCORE_FIELDS.filter((f) => f !== 'overallScore'))('rejects %s', async (field) => {
      await expectRejected({ resumeId, jobDescriptionId, [field]: 80 }, [field]);
    });

    it.each(ARRAY_FIELDS)('rejects %s', async (field) => {
      await expectRejected({ resumeId, jobDescriptionId, [field]: ['fake'] }, [field]);
    });

    it('rejects an arbitrary unknown key', async () => {
      await expectRejected({ resumeId, jobDescriptionId, foo: 'bar' }, ['foo']);
    });

    it('rejects multiple extra keys at once and mentions them', async () => {
      await expectRejected(
        { resumeId, jobDescriptionId, status: 'COMPLETED', overallScore: 99, strengths: ['a'], foo: 1 },
        ['status', 'overallScore', 'strengths', 'foo']
      );
    });

    it('rejects an extra key even when ids are valid and owned', async () => {
      const res = await expectRejected({ resumeId, jobDescriptionId, extra: true }, ['extra']);
      expect(res.body.data).toBeUndefined();
    });

    it('rejects an empty body', async () => {
      await expectRejected({});
    });

    it('rejects a missing jobDescriptionId', async () => {
      await expectRejected({ resumeId });
    });

    it('rejects a non-UUID resumeId', async () => {
      const res = await expectRejected({ resumeId: 'not-a-uuid', jobDescriptionId });
      expect(JSON.stringify(res.body.errors)).toContain('Invalid resume ID format');
    });

    it('rejects a non-UUID jobDescriptionId', async () => {
      const res = await expectRejected({ resumeId, jobDescriptionId: 'nope' });
      expect(JSON.stringify(res.body.errors)).toContain('Invalid job description ID format');
    });

    it('returns 404 for a non-existent resume', async () => {
      const before = await prisma.jobAnalysis.count();
      const res = await post({ resumeId: MISSING_UUID, jobDescriptionId });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(await prisma.jobAnalysis.count()).toBe(before);
    });

    it('returns 404 for a non-existent job description', async () => {
      const before = await prisma.jobAnalysis.count();
      const res = await post({ resumeId, jobDescriptionId: MISSING_UUID });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(await prisma.jobAnalysis.count()).toBe(before);
    });

    it('returns 401 without a token', async () => {
      const before = await prisma.jobAnalysis.count();
      const res = await post({ resumeId, jobDescriptionId }, null);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(await prisma.jobAnalysis.count()).toBe(before);
    });
  });

  describe('GET /api/v1/analyses & /api/v1/analyses/:id', () => {
    it('should list user analyses with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/analyses?page=1&limit=10')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve analysis details by ID for owner', async () => {
      const res = await request(app)
        .get(`/api/v1/analyses/${analysisId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(analysisId);
      expect(res.body.data).toHaveProperty('resume');
      expect(res.body.data).toHaveProperty('jobDescription');
    });

    it('should prevent User B from viewing User A analysis (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/analyses/${analysisId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Recommendations Workflow (/api/v1/analyses/:id/recommendations & /api/v1/recommendations/:id)', () => {
    it('should create recommendations for IMPROVE and LEARN_ADD categories', async () => {
      const improveRec = {
        category: 'IMPROVE',
        title: 'Highlight PostgreSQL query optimization',
        description: 'Include indexing strategies and query performance tuning in your projects section.',
        reason: 'Job specifically emphasizes large-scale data queries',
        priority: 'HIGH'
      };

      const res = await request(app)
        .post(`/api/v1/analyses/${analysisId}/recommendations`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send(improveRec);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('IMPROVE');
      expect(res.body.data.status).toBe('NOT_STARTED');

      recommendationId = res.body.data.id;
    });

    it('should retrieve recommendations for an analysis record', async () => {
      const res = await request(app)
        .get(`/api/v1/analyses/${analysisId}/recommendations`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should update recommendation status to IN_PROGRESS and COMPLETED', async () => {
      const resInProgress = await request(app)
        .patch(`/api/v1/recommendations/${recommendationId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(resInProgress.status).toBe(200);
      expect(resInProgress.body.data.status).toBe('IN_PROGRESS');

      const resCompleted = await request(app)
        .patch(`/api/v1/recommendations/${recommendationId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ status: 'COMPLETED' });

      expect(resCompleted.status).toBe(200);
      expect(resCompleted.body.data.status).toBe('COMPLETED');
    });

    it('should prevent User B from updating User A recommendation (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/recommendations/${recommendationId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ status: 'NOT_STARTED' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/analyses/:id', () => {
    it('should delete analysis record for owner', async () => {
      const res = await request(app)
        .delete(`/api/v1/analyses/${analysisId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const checkRes = await request(app)
        .get(`/api/v1/analyses/${analysisId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(checkRes.status).toBe(404);
    });
  });
});
