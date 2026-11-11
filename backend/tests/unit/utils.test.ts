import { ApiError } from '../../src/utils/apiError';
import { validateResumeFile } from '../../src/utils/fileValidator';
import { parsePagination, buildPaginationMeta } from '../../src/utils/pagination';

describe('Unit Tests: Utilities', () => {
  describe('ApiError', () => {
    it('should create badRequest error with status 400', () => {
      const error = ApiError.badRequest('Invalid input', [{ field: 'email', message: 'required' }]);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error.errors).toHaveLength(1);
    });

    it('should create unauthorized error with status 401', () => {
      const error = ApiError.unauthorized();
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('Unauthorized');
    });

    it('should create forbidden error with status 403', () => {
      const error = ApiError.forbidden();
      expect(error.statusCode).toBe(403);
    });

    it('should create notFound error with status 404', () => {
      const error = ApiError.notFound();
      expect(error.statusCode).toBe(404);
    });

    it('should create conflict error with status 409', () => {
      const error = ApiError.conflict('Duplicate email');
      expect(error.statusCode).toBe(409);
    });

    it('should create payloadTooLarge error with status 413', () => {
      const error = ApiError.payloadTooLarge();
      expect(error.statusCode).toBe(413);
    });

    it('should create unsupportedMediaType error with status 415', () => {
      const error = ApiError.unsupportedMediaType();
      expect(error.statusCode).toBe(415);
    });
  });

  describe('fileValidator', () => {
    it('should throw badRequest if file is missing', () => {
      expect(() => validateResumeFile(undefined)).toThrow('Resume file is required');
    });

    it('should throw badRequest if file is empty (size 0)', () => {
      const emptyFile = {
        size: 0,
        originalname: 'resume.pdf',
        mimetype: 'application/pdf'
      } as Express.Multer.File;

      expect(() => validateResumeFile(emptyFile)).toThrow('Uploaded file cannot be empty');
    });

    it('should throw unsupportedMediaType for invalid extension', () => {
      const txtFile = {
        size: 1024,
        originalname: 'resume.txt',
        mimetype: 'text/plain'
      } as Express.Multer.File;

      expect(() => validateResumeFile(txtFile)).toThrow('Only PDF and DOCX files are supported');
    });

    it('should throw unsupportedMediaType for disallowed MIME type', () => {
      const fakePdf = {
        size: 1024,
        originalname: 'resume.pdf',
        mimetype: 'image/jpeg'
      } as Express.Multer.File;

      expect(() => validateResumeFile(fakePdf)).toThrow('Only PDF and DOCX files are allowed');
    });

    it('should succeed for valid PDF file', () => {
      const validPdf = {
        size: 1024,
        originalname: 'my-resume.pdf',
        mimetype: 'application/pdf'
      } as Express.Multer.File;

      expect(() => validateResumeFile(validPdf)).not.toThrow();
    });

    it('should succeed for valid DOCX file', () => {
      const validDocx = {
        size: 2048,
        originalname: 'my-resume.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      } as Express.Multer.File;

      expect(() => validateResumeFile(validDocx)).not.toThrow();
    });
  });

  describe('pagination', () => {
    it('should parse default pagination correctly', () => {
      const { page, limit, skip } = parsePagination({});
      expect(page).toBe(1);
      expect(limit).toBe(10);
      expect(skip).toBe(0);
    });

    it('should parse custom pagination params', () => {
      const { page, limit, skip } = parsePagination({ page: '3', limit: '20' });
      expect(page).toBe(3);
      expect(limit).toBe(20);
      expect(skip).toBe(40);
    });

    it('should clamp limit to max 100', () => {
      const { limit } = parsePagination({ limit: '500' });
      expect(limit).toBe(100);
    });

    it('should build pagination metadata correctly', () => {
      const meta = buildPaginationMeta(45, 2, 10);
      expect(meta.total).toBe(45);
      expect(meta.page).toBe(2);
      expect(meta.limit).toBe(10);
      expect(meta.totalPages).toBe(5);
      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrev).toBe(true);
    });
  });
});
