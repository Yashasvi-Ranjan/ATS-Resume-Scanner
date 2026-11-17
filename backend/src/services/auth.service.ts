import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { AuthenticatedUser } from '../types';

const PROFILE_SELECT = {
  phone: true,
  location: true,
  targetRole: true,
  experienceLevel: true,
  headline: true,
  skills: true
} as const;

interface UpdateProfileInput {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  targetRole?: string;
  experienceLevel?: string;
  headline?: string;
  skills?: string[];
}

export class AuthService {
  private static generateToken(user: AuthenticatedUser): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    );
  }

  static async register(data: { name: string; email: string; password: string }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existing) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash
      },
      select: {
        id: true,
        name: true,
        email: true,
        ...PROFILE_SELECT,
        createdAt: true,
        updatedAt: true
      }
    });

    const token = this.generateToken(user);

    return { user, token };
  }

  static async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password credentials');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password credentials');
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name
    };

    const token = this.generateToken(authUser);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        targetRole: user.targetRole,
        experienceLevel: user.experienceLevel,
        headline: user.headline,
        skills: user.skills,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      token
    };
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        ...PROFILE_SELECT,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            resumes: true,
            jobDescriptions: true,
            analyses: true,
            enhancements: true,
            interviewSessions: true
          }
        }
      }
    });

    if (!user) {
      throw ApiError.notFound('User account not found');
    }

    return user;
  }

  static async updateProfile(userId: string, data: UpdateProfileInput) {
    if (data.email) {
      const existing = await prisma.user.findUnique({
        where: { email: data.email }
      });
      if (existing && existing.id !== userId) {
        throw ApiError.conflict('The requested email address is already in use by another account');
      }
    }

    // Text fields may be cleared with an empty string (stored as null).
    const nullable = (v: string | undefined) => (v === undefined ? undefined : v === '' ? null : v);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        phone: nullable(data.phone),
        location: nullable(data.location),
        targetRole: nullable(data.targetRole),
        experienceLevel: nullable(data.experienceLevel),
        headline: nullable(data.headline),
        ...(data.skills !== undefined && { skills: Array.from(new Set(data.skills)) })
      },
      select: {
        id: true,
        name: true,
        email: true,
        ...PROFILE_SELECT,
        createdAt: true,
        updatedAt: true
      }
    });

    return updated;
  }

  static async changePassword(
    userId: string,
    data: { currentPassword: string; newPassword: string }
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw ApiError.notFound('User account not found');
    }

    const isMatch = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw ApiError.badRequest('Current password provided does not match');
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(data.newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    });

    return { message: 'Password updated successfully' };
  }
}
