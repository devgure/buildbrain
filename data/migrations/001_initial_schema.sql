-- CreateTable users
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "companyName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "kycTier" TEXT DEFAULT 'TIER_1',
    "kycStatus" TEXT DEFAULT 'PENDING',
    "kycInquiryId" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "avatar" TEXT,
    "rating" DECIMAL(3,2),
    "totalReviews" INTEGER DEFAULT 0,
    "bio" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable wallets
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "usdBalance" DECIMAL(19,2) NOT NULL DEFAULT 0,
    "usdcBalance" DECIMAL(19,2) NOT NULL DEFAULT 0,
    "platformCredits" DECIMAL(19,2) NOT NULL DEFAULT 0,
    "kycTierLimit" DECIMAL(19,2) NOT NULL DEFAULT 100000,
    "monthlySettledAmount" DECIMAL(19,2) NOT NULL DEFAULT 0,
    "pendingPayments" DECIMAL(19,2) NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- CreateTable projects
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gcId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "budget" DECIMAL(19,2) NOT NULL,
    "scope" TEXT,
    "location" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "estimatedDurationDays" INTEGER,
    "projectType" TEXT DEFAULT 'GENERAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("gcId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- CreateTable milestones
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(19,2) NOT NULL,
    "percentage" DECIMAL(5,2),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "order" INTEGER,
    "deliverables" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE
);

-- CreateTable payments
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "projectId" TEXT,
    "milestoneId" TEXT,
    "amount" DECIMAL(19,2) NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'INTERNAL_LEDGER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stripeTransactionId" TEXT,
    "dwollaTransactionId" TEXT,
    "usdcTransactionId" TEXT,
    "verificationStatus" TEXT,
    "description" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("senderId") REFERENCES "User"("id"),
    FOREIGN KEY ("recipientId") REFERENCES "User"("id"),
    FOREIGN KEY ("projectId") REFERENCES "Project"("id"),
    FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id")
);

-- CreateTable jobs
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "requiredSkills" TEXT,
    "hourlyRate" DECIMAL(19,2),
    "totalBudget" DECIMAL(19,2),
    "duration" TEXT,
    "location" TEXT,
    "startDate" DATETIME,
    "geoLat" REAL,
    "geoLng" REAL,
    "openPositions" INTEGER DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE
);

-- CreateTable bids
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "amount" DECIMAL(19,2) NOT NULL,
    "proposal" TEXT,
    "portfolio" TEXT,
    "expectedDuration" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "aiScore" DECIMAL(5,2),
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE,
    FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- CreateTable documents
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "description" TEXT,
    "uploadedById" TEXT,
    "extractedData" TEXT,
    "aiVerified" BOOLEAN DEFAULT false,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("projectId") REFERENCES "Project"("id"),
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
);

-- CreateTable project assignments
CREATE TABLE "ProjectAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE,
    FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- CreateTable reviews
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "jobId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("reviewerId") REFERENCES "User"("id"),
    FOREIGN KEY ("revieweeId") REFERENCES "User"("id"),
    FOREIGN KEY ("jobId") REFERENCES "Job"("id")
);

-- CreateTable transaction logs
CREATE TABLE "TransactionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(19,2),
    "description" TEXT,
    "relatedPaymentId" TEXT,
    "timestamp" DATETIME NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id"),
    FOREIGN KEY ("relatedPaymentId") REFERENCES "Payment"("id")
);

-- CreateTable user skills
CREATE TABLE "UserSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "yearsOfExperience" INTEGER,
    "verified" BOOLEAN DEFAULT false,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- CreateTable certifications
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuedBy" TEXT,
    "issuedDate" DATETIME,
    "expirationDate" DATETIME,
    "verified" BOOLEAN DEFAULT false,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- CreateTable insurance documents
CREATE TABLE "InsuranceDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "insuranceType" TEXT,
    "provider" TEXT,
    "policyNumber" TEXT,
    "expirationDate" DATETIME,
    "documentUrl" TEXT,
    "verified" BOOLEAN DEFAULT false,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- CreateIndexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");
CREATE INDEX "Project_gcId_idx" ON "Project"("gcId");
CREATE INDEX "Milestone_projectId_idx" ON "Milestone"("projectId");
CREATE INDEX "Payment_senderId_idx" ON "Payment"("senderId");
CREATE INDEX "Payment_recipientId_idx" ON "Payment"("recipientId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Job_createdById_idx" ON "Job"("createdById");
CREATE INDEX "Bid_jobId_idx" ON "Bid"("jobId");
CREATE INDEX "Bid_bidderId_idx" ON "Bid"("bidderId");
CREATE INDEX "Review_revieweeId_idx" ON "Review"("revieweeId");
CREATE INDEX "TransactionLog_userId_idx" ON "TransactionLog"("userId");
