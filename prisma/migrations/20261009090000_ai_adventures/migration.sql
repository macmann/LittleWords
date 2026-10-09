ALTER TABLE "ChildProfile" ADD COLUMN "aiPlanningEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LearningSession" ADD COLUMN "adventurePlan" JSONB;
