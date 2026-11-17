-- AlterTable
ALTER TABLE "users" ADD COLUMN     "experienceLevel" TEXT,
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "targetRole" TEXT;
