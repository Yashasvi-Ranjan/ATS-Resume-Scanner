-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('NOT_PARSED', 'PROCESSING', 'PARSED', 'FAILED');

-- AlterTable
ALTER TABLE "resumes" ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "extractedText" TEXT,
ADD COLUMN     "parseError" TEXT,
ADD COLUMN     "parseStatus" "ParseStatus" NOT NULL DEFAULT 'NOT_PARSED',
ADD COLUMN     "parsedAt" TIMESTAMP(3),
ADD COLUMN     "parsedData" JSONB,
ADD COLUMN     "parserVersion" TEXT,
ADD COLUMN     "userEditedData" JSONB;

-- AlterTable
ALTER TABLE "job_descriptions" ADD COLUMN     "descriptionHash" TEXT,
ADD COLUMN     "parseError" TEXT,
ADD COLUMN     "parseStatus" "ParseStatus" NOT NULL DEFAULT 'NOT_PARSED',
ADD COLUMN     "parsedAt" TIMESTAMP(3),
ADD COLUMN     "parsedData" JSONB,
ADD COLUMN     "parserVersion" TEXT,
ADD COLUMN     "userEditedData" JSONB;

-- AlterTable
ALTER TABLE "job_analyses" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "inputHash" TEXT,
ADD COLUMN     "modelInfo" TEXT,
ADD COLUMN     "resultData" JSONB,
ADD COLUMN     "scoringVersion" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "analysis_recommendations" ADD COLUMN     "details" JSONB,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "resume_enhancements" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "changeMap" JSONB,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "generationStatus" "AnalysisStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "groundingReport" JSONB,
ADD COLUMN     "modelInfo" TEXT,
ADD COLUMN     "parentVersionId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'USER',
ADD COLUMN     "structuredContent" JSONB;

-- AlterTable
ALTER TABLE "interview_sessions" ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "generationStatus" "AnalysisStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "modelInfo" TEXT,
ADD COLUMN     "reportData" JSONB,
ADD COLUMN     "reportGeneratedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "interview_questions" ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "expectedTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "rationale" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "interview_evaluations" ADD COLUMN     "details" JSONB,
ADD COLUMN     "modelInfo" TEXT;

