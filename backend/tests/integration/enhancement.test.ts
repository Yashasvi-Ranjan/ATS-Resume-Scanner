import request from 'supertest';
import { createApp } from '../../src/app';
import prisma from '../../src/config/prisma';

const app = createApp();

describe('Integration Tests: Resume Enhancement Version Management', () => {
  let userAToken: string;
  let userBToken: string;
  let resumeId: string;
  let jobDescriptionId: string;
  let enhancementV1Id: string;

  beforeAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE users CASCADE;');

    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Enhance User A',
        email: 'enhance.userA@example.com',
        password: 'Password123!'
      });
    userAToken = resA.body.data.token;

    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Enhance User B',
        email: 'enhance.userB@example.com',
        password: 'Password123!'
      });
    userBToken = resB.body.data.token;

    const resumeRes = await request(app)
      .post('/api/v1/resumes')
      .set('Authorization', `Bearer ${userAToken}`)
      .attach('resume', Buffer.from('%PDF-1.4 Base Resume'), {
        filename: 'base-resume.pdf',
        contentType: 'application/pdf'
      });
    resumeId = resumeRes.body.data.id;

    const jdRes = await request(app)
      .post('/api/v1/job-descriptions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Fullstack Engineer',
        description: 'React, Node, TypeScript developer role.',
        requiredSkills: ['React', 'Node.js']
      });
    jobDescriptionId = jdRes.body.data.id;
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE users CASCADE;');
  });

  describe('POST /api/v1/enhancements (Versioning)', () => {
    it('should create initial version 1 of enhancement', async () => {
      const payload = {
        resumeId,
        jobDescriptionId,
        enhancedContent: '# Enhanced Resume v1\n- Strengthened technical summary and keywords.',
        status: 'DRAFT'
      };

      const res = await request(app)
        .post('/api/v1/enhancements')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.version).toBe(1);
      expect(res.body.data.enhancedContent).toBe(payload.enhancedContent);
      expect(res.body.data).toHaveProperty('documentStoragePath');

      enhancementV1Id = res.body.data.id;
    });

    it('should automatically increment version to 2 for subsequent enhancement of same resume and job', async () => {
      const payload = {
        resumeId,
        jobDescriptionId,
        enhancedContent: '# Enhanced Resume v2\n- Added cloud infrastructure metrics.',
        status: 'COMPLETED'
      };

      const res = await request(app)
        .post('/api/v1/enhancements')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.version).toBe(2);
      expect(res.body.data.status).toBe('COMPLETED');
    });
  });

  describe('GET /api/v1/enhancements & versions', () => {
    it('should list all enhancements for user', async () => {
      const res = await request(app)
        .get('/api/v1/enhancements')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should retrieve version history for an enhancement', async () => {
      const res = await request(app)
        .get(`/api/v1/enhancements/${enhancementV1Id}/versions`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.versions.length).toBe(2);
      expect(res.body.data.versions[0].version).toBe(1);
      expect(res.body.data.versions[1].version).toBe(2);
    });

    it('should download enhanced document content for owner', async () => {
      const res = await request(app)
        .get(`/api/v1/enhancements/${enhancementV1Id}/download`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain('# Enhanced Resume v1');
    });

    it('should prevent User B from accessing User A enhancement (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/enhancements/${enhancementV1Id}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
