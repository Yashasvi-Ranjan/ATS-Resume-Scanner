import request from 'supertest';
import { createApp } from '../../src/app';
import prisma from '../../src/config/prisma';

const app = createApp();

describe('Integration Tests: Job Description Management', () => {
  let userAToken: string;
  let userBToken: string;
  let jobDescriptionId: string;

  beforeAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE users CASCADE;');

    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Job User A',
        email: 'job.userA@example.com',
        password: 'Password123!'
      });
    userAToken = resA.body.data.token;

    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Job User B',
        email: 'job.userB@example.com',
        password: 'Password123!'
      });
    userBToken = resB.body.data.token;
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE users CASCADE;');
  });

  describe('POST /api/v1/job-descriptions', () => {
    it('should create a job description with required fields', async () => {
      const payload = {
        title: 'Senior Backend Engineer',
        companyName: 'Acme Corp',
        description: 'We are seeking an experienced Backend Engineer to build scalable microservices.',
        requiredSkills: ['Node.js', 'TypeScript', 'PostgreSQL'],
        preferredSkills: ['Docker', 'Kubernetes'],
        experienceRequirements: '3+ years of backend development',
        educationRequirements: "Bachelor's in Computer Science or equivalent"
      };

      const res = await request(app)
        .post('/api/v1/job-descriptions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(payload.title);
      expect(res.body.data.requiredSkills).toEqual(payload.requiredSkills);
      expect(res.body.data).toHaveProperty('id');

      jobDescriptionId = res.body.data.id;
    });

    it('should reject creation when required skills array is empty (400 Bad Request)', async () => {
      const invalidPayload = {
        title: 'Junior Developer',
        description: 'Entry level software developer position.',
        requiredSkills: []
      };

      const res = await request(app)
        .post('/api/v1/job-descriptions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/job-descriptions & /api/v1/job-descriptions/:id', () => {
    it('should list all job descriptions for authenticated user with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/job-descriptions?page=1&limit=5')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta.page).toBe(1);
    });

    it('should retrieve job description by ID for owner', async () => {
      const res = await request(app)
        .get(`/api/v1/job-descriptions/${jobDescriptionId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(jobDescriptionId);
    });

    it('should prevent User B from viewing User A job description (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/job-descriptions/${jobDescriptionId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/job-descriptions/:id', () => {
    it('should update job description for owner', async () => {
      const updateData = {
        title: 'Lead Backend Engineer',
        companyName: 'Acme Global Technologies'
      };

      const res = await request(app)
        .patch(`/api/v1/job-descriptions/${jobDescriptionId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(updateData.title);
      expect(res.body.data.companyName).toBe(updateData.companyName);
    });

    it('should prevent User B from updating User A job description (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/job-descriptions/${jobDescriptionId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/job-descriptions/:id', () => {
    it('should prevent User B from deleting User A job description (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/v1/job-descriptions/${jobDescriptionId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should delete job description for owner', async () => {
      const res = await request(app)
        .delete(`/api/v1/job-descriptions/${jobDescriptionId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const checkRes = await request(app)
        .get(`/api/v1/job-descriptions/${jobDescriptionId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(checkRes.status).toBe(404);
    });
  });
});
