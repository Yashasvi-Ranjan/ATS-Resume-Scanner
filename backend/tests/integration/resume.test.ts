import request from 'supertest';
import { createApp } from '../../src/app';
import prisma from '../../src/config/prisma';

const app = createApp();

describe('Integration Tests: Resume Management & File Uploads', () => {
  let userAToken: string;
  let userBToken: string;
  let userAResumeId: string;

  beforeAll(async () => {
    // Clean up test tables
    await prisma.$executeRawUnsafe('TRUNCATE TABLE users CASCADE;');

    // Register User A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'User A',
        email: 'resume.userA@example.com',
        password: 'Password123!'
      });
    userAToken = resA.body.data.token;

    // Register User B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'User B',
        email: 'resume.userB@example.com',
        password: 'Password123!'
      });
    userBToken = resB.body.data.token;
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE users CASCADE;');
  });

  describe('POST /api/v1/resumes', () => {
    it('should upload a valid PDF resume', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 Mock PDF content for testing');

      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('resume', pdfBuffer, {
          filename: 'software-engineer-resume.pdf',
          contentType: 'application/pdf'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.originalFilename).toBe('software-engineer-resume.pdf');
      expect(res.body.data.mimeType).toBe('application/pdf');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('storagePath');

      userAResumeId = res.body.data.id;
    });

    it('should upload a valid DOCX resume', async () => {
      const docxBuffer = Buffer.from('Mock DOCX binary payload');

      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('resume', docxBuffer, {
          filename: 'cv-candidate.docx',
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.originalFilename).toBe('cv-candidate.docx');
    });

    it('should reject non-supported file extension (415 Unsupported Media Type)', async () => {
      const txtBuffer = Buffer.from('plain text resume');

      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('resume', txtBuffer, {
          filename: 'resume.txt',
          contentType: 'text/plain'
        });

      expect(res.status).toBe(415);
      expect(res.body.success).toBe(false);
    });

    it('should reject empty upload if no file is provided', async () => {
      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/resumes & /api/v1/resumes/:id', () => {
    it('should list all resumes for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/resumes?page=1&limit=10')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta.page).toBe(1);
    });

    it('should retrieve resume metadata by ID for owner', async () => {
      const res = await request(app)
        .get(`/api/v1/resumes/${userAResumeId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(userAResumeId);
    });

    it('should enforce resource ownership: prevent User B from viewing User A resume (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/resumes/${userAResumeId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('do not have permission');
    });
  });

  describe('GET /api/v1/resumes/:id/download', () => {
    it('should download resume file for owner', async () => {
      const res = await request(app)
        .get(`/api/v1/resumes/${userAResumeId}/download`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    it('should prevent User B from downloading User A resume (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/resumes/${userAResumeId}/download`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/resumes/:id', () => {
    it('should prevent User B from deleting User A resume (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/v1/resumes/${userAResumeId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow owner to delete resume', async () => {
      const res = await request(app)
        .delete(`/api/v1/resumes/${userAResumeId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify resume is deleted
      const checkRes = await request(app)
        .get(`/api/v1/resumes/${userAResumeId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(checkRes.status).toBe(404);
    });
  });
});
