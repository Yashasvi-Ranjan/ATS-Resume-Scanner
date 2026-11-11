import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

export interface StorageService {
  saveFile(buffer: Buffer, filename: string, subfolder?: string): Promise<string>;
  deleteFile(filePath: string): Promise<void>;
  fileExists(filePath: string): Promise<boolean>;
  getAbsolutePath(relativePath: string): string;
}

export class LocalDiskStorageService implements StorageService {
  private baseDir: string;

  constructor(baseDir: string = env.UPLOAD_DIR) {
    this.baseDir = path.resolve(process.cwd(), baseDir);
    this.ensureDirectoryExists(this.baseDir);
    this.ensureDirectoryExists(path.join(this.baseDir, 'resumes'));
    this.ensureDirectoryExists(path.join(this.baseDir, 'enhancements'));
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  async saveFile(buffer: Buffer, filename: string, subfolder = 'resumes'): Promise<string> {
    const targetDir = path.join(this.baseDir, subfolder);
    this.ensureDirectoryExists(targetDir);
    const targetPath = path.join(targetDir, filename);
    await fs.promises.writeFile(targetPath, buffer);
    // Return relative path for portability across environments
    return path.join(subfolder, filename);
  }

  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = this.getAbsolutePath(relativePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  async fileExists(relativePath: string): Promise<boolean> {
    const fullPath = this.getAbsolutePath(relativePath);
    return fs.existsSync(fullPath);
  }

  getAbsolutePath(relativePath: string): string {
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }
    return path.join(this.baseDir, relativePath);
  }
}

export const defaultStorageService = new LocalDiskStorageService();
