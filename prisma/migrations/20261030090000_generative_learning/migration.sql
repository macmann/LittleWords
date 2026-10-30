CREATE TABLE "GenerativeLessonRecord" (
 "id" TEXT PRIMARY KEY, "childId" TEXT NOT NULL REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "language" "Language" NOT NULL, "lesson" JSONB NOT NULL, "source" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3)
);
CREATE INDEX "GenerativeLessonRecord_childId_createdAt_idx" ON "GenerativeLessonRecord"("childId", "createdAt");
CREATE TABLE "GenerativeActivityResult" (
 "id" TEXT PRIMARY KEY, "lessonId" TEXT NOT NULL REFERENCES "GenerativeLessonRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "wordId" TEXT NOT NULL, "correct" BOOLEAN, "responseTime" INTEGER NOT NULL, "selectedIds" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "GenerativeActivityResult_lessonId_idx" ON "GenerativeActivityResult"("lessonId");
