import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { defaultStorageService } from './storage.service';
import { validateResumeFile } from '../utils/fileValidator';
import { ApiError } from '../utils/apiError';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

export class ResumeService {
  static async uploadResume(
    userId: string,
    file: Express.Multer.File | undefined
  ) {
    validateResumeFile(file);
    const validFile = file!;

    const ext = path.extname(validFile.originalname).toLowerCase();
    const storedFilename = `${uuidv4()}${ext}`;

    // Store file in modular storage (resumes subfolder)
    const storagePath = await defaultStorageService.saveFile(
      validFile.buffer,
      storedFilename,
      'resumes'
    );

    // Save metadata in database
    const resume = await prisma.resume.create({
      data: {
        userId,
        originalFilename: validFile.originalname,
        storedFilename,
        mimeType: validFile.mimetype,
        fileSize: validFile.size,
        storagePath
      }
    });

    return resume;
  }

  static async listUserResumes(
    userId: string,
    queryParams: { page?: unknown; limit?: unknown }
  ) {
    const { page, limit, skip } = parsePagination(queryParams);

    const [total, resumes] = await Promise.all([
      prisma.resume.count({ where: { userId } }),
      prisma.resume.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    return { resumes, meta };
  }

  static async getResumeById(userId: string, resumeId: string) {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId }
    });

    if (!resume) {
      throw ApiError.notFound('Resume not found');
    }

    if (resume.userId !== userId) {
      throw ApiError.forbidden('You do not have permission to access this resume');
    }

    return resume;
  }

  static async getResumeFileForDownload(userId: string, resumeId: string) {
    const resume = await this.getResumeById(userId, resumeId);
    const absolutePath = defaultStorageService.getAbsolutePath(resume.storagePath);

    const exists = await defaultStorageService.fileExists(resume.storagePath);
    if (!exists) {
      throw ApiError.notFound('Resume file not found on storage server');
    }

    return {
      absolutePath,
      originalFilename: resume.originalFilename,
      mimeType: resume.mimeType
    };
  }

  static async deleteResume(userId: string, resumeId: string) {
    const resume = await this.getResumeById(userId, resumeId);

    // Delete file from disk
    await defaultStorageService.deleteFile(resume.storagePath);

    // Delete record from database
    await prisma.resume.delete({
      where: { id: resumeId }
    });

    return { message: 'Resume deleted successfully' };
  }
}
