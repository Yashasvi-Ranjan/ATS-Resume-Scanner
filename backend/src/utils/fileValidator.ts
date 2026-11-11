import path from 'path';
import { ApiError } from './apiError';

export const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
];

export function validateResumeFile(file: Express.Multer.File | undefined): void {
  if (!file) {
    throw ApiError.badRequest('Resume file is required');
  }

  if (file.size === 0) {
    throw ApiError.badRequest('Uploaded file cannot be empty');
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw ApiError.unsupportedMediaType(
      `Invalid file format (${ext}). Only PDF and DOCX files are supported.`
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw ApiError.unsupportedMediaType(
      `Invalid MIME type (${file.mimetype}). Only PDF and DOCX files are allowed.`
    );
  }
}
