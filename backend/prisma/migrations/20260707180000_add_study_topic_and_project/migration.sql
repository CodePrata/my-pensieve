-- CreateTable
CREATE TABLE "public"."StudyTopic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "examName" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "deadline" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- Seed rows matching the former hardcoded mocks (topic-001/002, proj-001/002).
INSERT INTO "public"."StudyTopic" (
    "id",
    "name",
    "examName",
    "domain",
    "status",
    "deadline",
    "notes",
    "createdAt",
    "updatedAt"
) VALUES
(
    'topic-001',
    'Cryptography basics',
    'CompTIA Security+',
    '1.2',
    'in_progress',
    '2026-08-15',
    'Review symmetric vs asymmetric encryption.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'topic-002',
    'Network security controls',
    'CompTIA Security+',
    '3.2',
    'not_started',
    NULL,
    '',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

INSERT INTO "public"."Project" (
    "id",
    "name",
    "repoUrl",
    "status",
    "description",
    "createdAt",
    "updatedAt"
) VALUES
(
    'proj-001',
    'My Pensieve',
    'https://github.com/example/my-pensieve',
    'active',
    'Personal knowledge and briefing dashboard.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'proj-002',
    'Capture Bot',
    'https://github.com/example/capture-bot',
    'paused',
    'Telegram listener for vault captures.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
