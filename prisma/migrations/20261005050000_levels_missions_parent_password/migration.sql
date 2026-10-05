-- AlterTable
ALTER TABLE "ChildProfile" ADD COLUMN     "practiceLevel" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LearningSession" ADD COLUMN     "missionId" TEXT;

-- CreateTable
CREATE TABLE "ParentCredential" (
    "id" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "sessionVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionProgress" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "sessionId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MissionProgress_sessionId_key" ON "MissionProgress"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionProgress_childId_missionId_language_key" ON "MissionProgress"("childId", "missionId", "language");

-- AddForeignKey
ALTER TABLE "MissionProgress" ADD CONSTRAINT "MissionProgress_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionProgress" ADD CONSTRAINT "MissionProgress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LearningSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
