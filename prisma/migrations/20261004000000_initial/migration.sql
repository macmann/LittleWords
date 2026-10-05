-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'MY', 'DE');

-- CreateEnum
CREATE TYPE "VocabularyStatus" AS ENUM ('KNOWN', 'LEARNING', 'NEW');

-- CreateEnum
CREATE TYPE "ConceptType" AS ENUM ('OBJECT', 'ACTION', 'COLOR', 'DESCRIPTION', 'PERSON');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "primaryLanguage" "Language" NOT NULL DEFAULT 'EN',
    "enabledLanguages" "Language"[] DEFAULT ARRAY['EN', 'MY', 'DE']::"Language"[],
    "cardsPerSession" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concept" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "type" "ConceptType" NOT NULL DEFAULT 'OBJECT',
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "childId" TEXT,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptTranslation" (
    "id" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "word" TEXT NOT NULL,
    "phraseLevel2" TEXT NOT NULL,
    "phraseLevel3" TEXT NOT NULL,
    "sentence" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "audioWordUrl" TEXT,
    "audioPhraseUrl" TEXT,
    "audioSentenceUrl" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConceptTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildVocabulary" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "status" "VocabularyStatus" NOT NULL DEFAULT 'NEW',
    "lastSeen" TIMESTAMP(3),
    "seenCount" INTEGER NOT NULL DEFAULT 0,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "parentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "comfortableLevel" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ChildVocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningSession" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "categoryId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "LearningSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionCard" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "levelShown" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "SessionCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Concept_slug_key" ON "Concept"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptTranslation_conceptId_language_key" ON "ConceptTranslation"("conceptId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "ChildVocabulary_childId_conceptId_key" ON "ChildVocabulary"("childId", "conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionCard_sessionId_sequence_key" ON "SessionCard"("sessionId", "sequence");

-- AddForeignKey
ALTER TABLE "ChildProfile" ADD CONSTRAINT "ChildProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptTranslation" ADD CONSTRAINT "ConceptTranslation_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildVocabulary" ADD CONSTRAINT "ChildVocabulary_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildVocabulary" ADD CONSTRAINT "ChildVocabulary_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCard" ADD CONSTRAINT "SessionCard_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LearningSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCard" ADD CONSTRAINT "SessionCard_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
