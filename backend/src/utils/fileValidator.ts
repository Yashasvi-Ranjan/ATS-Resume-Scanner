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

  // Magic-byte sniffing: the declared extension/MIME must match the actual content.
  const buf = file.buffer;
  const head = buf ? buf.subarray(0, 1024).toString('latin1') : '';
  if (ext === '.pdf') {
    if (!head.includes('%PDF-')) {
      throw ApiError.unsupportedMediaType('File content is not a valid PDF (signature mismatch).');
    }
  } else if (ext === '.docx') {
    if (!buf || buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b || buf[2] !== 0x03 || buf[3] !== 0x04) {
      throw ApiError.unsupportedMediaType('File content is not a valid DOCX (signature mismatch).');
    }
  }
}
