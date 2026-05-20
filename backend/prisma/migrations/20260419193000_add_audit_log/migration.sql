-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminUsername" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL DEFAULT 'N/A',
    "details" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- Index for latest-first audit browsing
CREATE INDEX IF NOT EXISTS "audit_log_createdAt_idx" ON "audit_log"("createdAt");
