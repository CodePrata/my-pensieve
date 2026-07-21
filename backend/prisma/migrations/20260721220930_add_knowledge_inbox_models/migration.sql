-- CreateTable
CREATE TABLE "RawItem" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "captureMethod" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "rawFilePath" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WikiPage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "concept" TEXT,
    "filePath" TEXT NOT NULL,
    "summary" TEXT,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WikiPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WikiPageSource" (
    "id" TEXT NOT NULL,
    "rawItemId" TEXT NOT NULL,
    "wikiPageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WikiPageSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RawItem_rawFilePath_key" ON "RawItem"("rawFilePath");

-- CreateIndex
CREATE UNIQUE INDEX "WikiPage_filePath_key" ON "WikiPage"("filePath");

-- CreateIndex
CREATE UNIQUE INDEX "WikiPageSource_rawItemId_wikiPageId_key" ON "WikiPageSource"("rawItemId", "wikiPageId");

-- AddForeignKey
ALTER TABLE "WikiPageSource" ADD CONSTRAINT "WikiPageSource_rawItemId_fkey" FOREIGN KEY ("rawItemId") REFERENCES "RawItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageSource" ADD CONSTRAINT "WikiPageSource_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "WikiPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
