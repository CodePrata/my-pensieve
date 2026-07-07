-- CreateTable
CREATE TABLE "BriefingPriority" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "priorityType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BriefingPriority_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BriefingPriority" ADD CONSTRAINT "BriefingPriority_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "BriefingSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
