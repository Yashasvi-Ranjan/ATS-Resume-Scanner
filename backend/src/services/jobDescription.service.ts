import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { legacyIsAutomatic } from '../ai/jd/jdParser.service';
import { ApiError } from '../utils/apiError';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

export interface CreateJobDescriptionDTO {
  title: string;
  companyName?: string | null;
  description: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  experienceRequirements?: string | null;
  educationRequirements?: string | null;
}

export interface UpdateJobDescriptionDTO {
  title?: string;
  companyName?: string | null;
  description?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  experienceRequirements?: string | null;
  educationRequirements?: string | null;
}

export class JobDescriptionService {
  static async create(userId: string, data: CreateJobDescriptionDTO) {
    const jobDescription = await prisma.jobDescription.create({
      data: {
        userId,
        title: data.title,
        companyName: data.companyName,
        description: data.description,
        requiredSkills: data.requiredSkills ?? [],
        preferredSkills: data.preferredSkills || [],
        experienceRequirements: data.experienceRequirements,
        educationRequirements: data.educationRequirements
      }
    });

    return jobDescription;
  }

  static async listUserJobDescriptions(
    userId: string,
    queryParams: { page?: unknown; limit?: unknown }
  ) {
    const { page, limit, skip } = parsePagination(queryParams);

    const [total, jobDescriptions] = await Promise.all([
      prisma.jobDescription.count({ where: { userId } }),
      prisma.jobDescription.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    return { jobDescriptions, meta };
  }

  static async getById(userId: string, id: string) {
    const jobDescription = await prisma.jobDescription.findUnique({
      where: { id }
    });

    if (!jobDescription) {
      throw ApiError.notFound('Job description not found');
    }

    if (jobDescription.userId !== userId) {
      throw ApiError.forbidden('You do not have permission to access this job description');
    }

    return jobDescription;
  }

  static async update(userId: string, id: string, data: UpdateJobDescriptionDTO) {
    const existing = await this.getById(userId, id);

    // Editing the description makes any parse stale: reset parse state (and automatic legacy values) so
    // downstream modules never use requirements that came from the old text.
    const descriptionChanged = data.description !== undefined && data.description !== existing.description;
    const stale: Prisma.JobDescriptionUpdateInput = {};
    if (descriptionChanged) {
      const auto = legacyIsAutomatic(existing);
      Object.assign(stale, {
        parseStatus: 'NOT_PARSED',
        parseError: null,
        parsedData: Prisma.DbNull,
        userEditedData: Prisma.DbNull,
        parsedAt: null,
        parserVersion: null,
        descriptionHash: null
      });
      if (auto) {
        if (data.requiredSkills === undefined) stale.requiredSkills = [];
        if (data.preferredSkills === undefined) stale.preferredSkills = [];
        if (data.experienceRequirements === undefined) stale.experienceRequirements = null;
        if (data.educationRequirements === undefined) stale.educationRequirements = null;
      }
    }

    const updated = await prisma.jobDescription.update({
      where: { id },
      data: {
        ...stale,
        ...(data.title !== undefined && { title: data.title }),
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.requiredSkills !== undefined && { requiredSkills: data.requiredSkills }),
        ...(data.preferredSkills !== undefined && { preferredSkills: data.preferredSkills }),
        ...(data.experienceRequirements !== undefined && {
          experienceRequirements: data.experienceRequirements
        }),
        ...(data.educationRequirements !== undefined && {
          educationRequirements: data.educationRequirements
        })
      }
    });

    return updated;
  }

  static async delete(userId: string, id: string) {
    await this.getById(userId, id);

    await prisma.jobDescription.delete({
      where: { id }
    });

    return { message: 'Job description deleted successfully' };
  }
}
