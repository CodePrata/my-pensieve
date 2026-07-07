-- AlterTable
ALTER TABLE "public"."StudyTopic" ADD COLUMN "importance" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "public"."StudyTopic" ADD COLUMN "estimatedDurationMinutes" INTEGER;

-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN "importance" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "public"."Project" ADD COLUMN "dueDate" DATE;
ALTER TABLE "public"."Project" ADD COLUMN "estimatedDurationMinutes" INTEGER;
