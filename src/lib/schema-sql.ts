// Schema SQL for SQLite — auto-generated from prisma/schema.prisma
// Used by ensureSchema() to create tables on serverless platforms (Vercel)
export const SCHEMA_SQL = `
-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "provider" TEXT NOT NULL DEFAULT 'credentials',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InstagramAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "igUserId" TEXT NOT NULL,
    "igUsername" TEXT NOT NULL,
    "igProfilePic" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "tokenExpiresAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEventAt" DATETIME,
    CONSTRAINT "InstagramAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "igAccountId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "businessName" TEXT,
    "tone" TEXT NOT NULL DEFAULT 'friendly',
    "description" TEXT,
    "products" TEXT,
    "services" TEXT,
    "faqs" TEXT,
    "pricingVisible" BOOLEAN NOT NULL DEFAULT false,
    "pricingNote" TEXT,
    "purchaseLink" TEXT,
    "workingHours" TEXT,
    "specialRules" TEXT,
    "aiFallbackEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiConfig_igAccountId_fkey" FOREIGN KEY ("igAccountId") REFERENCES "InstagramAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "igAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerKeywords" TEXT NOT NULL,
    "triggerMatchMode" TEXT NOT NULL DEFAULT 'any',
    "responseType" TEXT NOT NULL,
    "staticResponse" TEXT,
    "mediaUrl" TEXT,
    "aiPromptOverride" TEXT,
    "conditionsJson" TEXT,
    "actionsJson" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AutomationRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AutomationRule_igAccountId_fkey" FOREIGN KEY ("igAccountId") REFERENCES "InstagramAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConversationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "igAccountId" TEXT NOT NULL,
    "contactIgId" TEXT NOT NULL,
    "contactUsername" TEXT,
    "channel" TEXT NOT NULL,
    "inboundMessage" TEXT NOT NULL,
    "outboundMessage" TEXT,
    "matchedRuleId" TEXT,
    "wasAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "intent" TEXT,
    "suggestedAction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'auto',
    "postPermalink" TEXT,
    "aiModel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConversationLog_igAccountId_fkey" FOREIGN KEY ("igAccountId") REFERENCES "InstagramAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConversationLog_matchedRuleId_fkey" FOREIGN KEY ("matchedRuleId") REFERENCES "AutomationRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "igAccountId" TEXT,
    "contactIgId" TEXT NOT NULL,
    "contactUsername" TEXT,
    "tags" TEXT NOT NULL DEFAULT '',
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "source" TEXT NOT NULL DEFAULT 'dm',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lead_igAccountId_fkey" FOREIGN KEY ("igAccountId") REFERENCES "InstagramAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "seats" INTEGER NOT NULL DEFAULT 1,
    "currentPeriodEnd" DATETIME,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "igAccountId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "signature" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "InstagramAccount_tenantId_idx" ON "InstagramAccount"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramAccount_tenantId_igUserId_key" ON "InstagramAccount"("tenantId", "igUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AiConfig_igAccountId_key" ON "AiConfig"("igAccountId");

-- CreateIndex
CREATE INDEX "AiConfig_tenantId_idx" ON "AiConfig"("tenantId");

-- CreateIndex
CREATE INDEX "AutomationRule_tenantId_igAccountId_idx" ON "AutomationRule"("tenantId", "igAccountId");

-- CreateIndex
CREATE INDEX "AutomationRule_priority_idx" ON "AutomationRule"("priority");

-- CreateIndex
CREATE INDEX "ConversationLog_tenantId_igAccountId_idx" ON "ConversationLog"("tenantId", "igAccountId");

-- CreateIndex
CREATE INDEX "ConversationLog_contactIgId_idx" ON "ConversationLog"("contactIgId");

-- CreateIndex
CREATE INDEX "ConversationLog_createdAt_idx" ON "ConversationLog"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_tenantId_idx" ON "Lead"("tenantId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_tenantId_key" ON "Subscription"("tenantId");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_idx" ON "WebhookEvent"("status");

-- CreateIndex
CREATE INDEX "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");

npm notice
npm notice New minor version of npm available! 11.13.0 -> 11.18.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.18.0
npm notice To update run: npm install -g npm@11.18.0
npm notice
`;
