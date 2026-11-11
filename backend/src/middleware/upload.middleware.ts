import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES } from '../utils/fileValidator';

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      ApiError.unsupportedMediaType(
        `Invalid file extension '${ext}'. Only PDF and DOCX files are allowed.`
      )
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      ApiError.unsupportedMediaType(
        `Invalid MIME type '${file.mimetype}'. Only PDF and DOCX files are allowed.`
      )
    );
  }

  cb(null, true);
};

export const resumeUpload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 // e.g. 10MB in bytes
  },
  fileFilter
});
