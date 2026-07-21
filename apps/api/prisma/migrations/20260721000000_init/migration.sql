-- CreateTable
CREATE TABLE "SchemaMeta" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "version" TEXT NOT NULL DEFAULT '0.1.0',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemaMeta_pkey" PRIMARY KEY ("id")
);
