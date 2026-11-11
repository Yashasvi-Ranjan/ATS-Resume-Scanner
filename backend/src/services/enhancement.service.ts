import { EnhancementStatus } from '@prisma/client';
import prisma from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { defaultStorageService } from './storage.service';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

export interface CreateEnhancementDTO {
  resumeId: string;
  jobDescriptionId: string;
  enhancedContent?: string | null;
  status?: EnhancementStatus;
}

export class EnhancementService {
  static async create(userId: string, data: CreateEnhancementDTO) {
    // 1. Verify resume ownership
    const resume = await prisma.resume.findUnique({
      where: { id: data.resumeId }
    });
    if (!resume) {
      throw ApiError.notFound('Resume not found');
    }
    if (resume.userId !== userId) {
      throw ApiError.forbidden('You do not own the specified resume');
    }

    // 2. Verify job description ownership
    const jobDescription = await prisma.jobDescription.findUnique({
      where: { id: data.jobDescriptionId }
    });
    if (!jobDescription) {
      throw ApiError.notFound('Job description not found');
    }
    if (jobDescription.userId !== userId) {
      throw ApiError.forbidden('You do not own the specified job description');
    }

    // 3. Determine next version number for this resume + job description combination
    const latestVersion = await prisma.resumeEnhancement.findFirst({
      where: {
        userId,
        resumeId: data.resumeId,
        jobDescriptionId: data.jobDescriptionId
      },
      orderBy: { version: 'desc' },
      select: { version: true }
    });

    const nextVersion = (latestVersion?.version || 0) + 1;

    // Optional: save enhanced content as text document if provided
    let documentStoragePath: string | null = null;
    if (data.enhancedContent) {
      const filename = `enhanced-${data.resumeId}-v${nextVersion}.txt`;
      documentStoragePath = await defaultStorageService.saveFile(
        Buffer.from(data.enhancedContent, 'utf-8'),
        filename,
        'enhancements'
      );
    }

    const enhancement = await prisma.resumeEnhancement.create({
      data: {
        userId,
        resumeId: data.resumeId,
        jobDescriptionId: data.jobDescriptionId,
        version: nextVersion,
        enhancedContent: data.enhancedContent,
        documentStoragePath,
        status: data.status || EnhancementStatus.DRAFT
      },
      include: {
        resume: {
          select: { id: true, originalFilename: true }
        },
        jobDescription: {
          select: { id: true, title: true, companyName: true }
        }
      }
    });

    return enhancement;
  }

  static async listUserEnhancements(
    userId: string,
    queryParams: { page?: unknown; limit?: unknown }
  ) {
    const { page, limit, skip } = parsePagination(queryParams);

    const [total, enhancements] = await Promise.all([
      prisma.resumeEnhancement.count({ where: { userId } }),
      prisma.resumeEnhancement.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          resume: {
            select: { id: true, originalFilename: true }
          },
          jobDescription: {
            select: { id: true, title: true, companyName: true }
          }
        }
      })
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    return { enhancements, meta };
  }

  static async getById(userId: string, id: string) {
    const enhancement = await prisma.resumeEnhancement.findUnique({
      where: { id },
      include: {
        resume: {
          select: {
            id: true,
            originalFilename: true,
            storedFilename: true,
            mimeType: true,
            fileSize: true,
            createdAt: true
          }
        },
        jobDescription: {
          select: {
            id: true,
            title: true,
            companyName: true,
            description: true,
            requiredSkills: true
          }
        }
      }
    });

    if (!enhancement) {
      throw ApiError.notFound('Enhancement record not found');
    }

    if (enhancement.userId !== userId) {
      throw ApiError.forbidden('You do not have permission to access this enhancement');
    }

    return enhancement;
  }

  static async getVersions(userId: string, id: string) {
    const target = await this.getById(userId, id);

    const versions = await prisma.resumeEnhancement.findMany({
      where: {
        userId,
        resumeId: target.resumeId,
        jobDescriptionId: target.jobDescriptionId
      },
      orderBy: { version: 'asc' },
      select: {
        id: true,
        version: true,
        status: true,
        enhancedContent: true,
        documentStoragePath: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return {
      currentId: id,
      resumeId: target.resumeId,
      jobDescriptionId: target.jobDescriptionId,
      versions
    };
  }

  static async getDownloadFile(userId: string, id: string) {
    const enhancement = await this.getById(userId, id);

    if (!enhancement.documentStoragePath) {
      throw ApiError.notFound('No generated enhancement document available for download');
    }

    const exists = await defaultStorageService.fileExists(enhancement.documentStoragePath);
    if (!exists) {
      throw ApiError.notFound('Enhanced document file not found on storage server');
    }

    const absolutePath = defaultStorageService.getAbsolutePath(
      enhancement.documentStoragePath
    );

    return {
      absolutePath,
      filename: `enhanced-resume-v${enhancement.version}.txt`,
      mimeType: 'text/plain'
    };
  }
}
