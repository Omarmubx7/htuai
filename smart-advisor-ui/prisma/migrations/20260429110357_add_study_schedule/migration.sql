-- AlterTable
ALTER TABLE "semesters" ADD COLUMN     "ai_exam_tips" JSONB DEFAULT '[]',
ADD COLUMN     "study_schedule" JSONB DEFAULT '[]';
