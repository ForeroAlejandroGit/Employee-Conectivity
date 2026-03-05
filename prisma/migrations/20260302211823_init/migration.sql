-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeHrId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "salary" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "position" TEXT,
    "state" TEXT NOT NULL,
    "departmentId" TEXT,
    "divisionId" TEXT,
    "management" TEXT,
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Division" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "emailsSent" INTEGER NOT NULL DEFAULT 0,
    "lastLoginTime" DATETIME,
    "filesEdited" INTEGER NOT NULL DEFAULT 0,
    "filesViewed" INTEGER NOT NULL DEFAULT 0,
    "filesCreated" INTEGER NOT NULL DEFAULT 0,
    "meetingCount" INTEGER NOT NULL DEFAULT 0,
    "meetingMinutes" INTEGER NOT NULL DEFAULT 0,
    "chatMessagesSent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyMetric_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "emailActive" INTEGER NOT NULL,
    "driveActive" INTEGER NOT NULL,
    "chatActive" INTEGER NOT NULL,
    "meetingsActive" INTEGER NOT NULL,
    "totalScore" REAL NOT NULL,
    "coefficientSet" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyScore_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoefficientSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "emailWeight" REAL NOT NULL,
    "emailLastUse" REAL NOT NULL,
    "filesEdited" REAL NOT NULL,
    "filesViewed" REAL NOT NULL,
    "driveLastUse" REAL NOT NULL,
    "filesCreated" REAL NOT NULL,
    "chatWeight" REAL NOT NULL,
    "meetingsWeight" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordsCount" INTEGER NOT NULL DEFAULT 0,
    "dateRangeFrom" DATETIME,
    "dateRangeTo" DATETIME,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeHrId_key" ON "Employee"("employeeHrId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_email_idx" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");

-- CreateIndex
CREATE INDEX "Employee_divisionId_idx" ON "Employee"("divisionId");

-- CreateIndex
CREATE INDEX "Employee_state_idx" ON "Employee"("state");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Division_name_key" ON "Division"("name");

-- CreateIndex
CREATE INDEX "DailyMetric_date_idx" ON "DailyMetric"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetric_employeeId_date_key" ON "DailyMetric"("employeeId", "date");

-- CreateIndex
CREATE INDEX "DailyScore_date_idx" ON "DailyScore"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyScore_employeeId_date_key" ON "DailyScore"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CoefficientSet_name_key" ON "CoefficientSet"("name");

-- CreateIndex
CREATE INDEX "SyncLog_jobType_createdAt_idx" ON "SyncLog"("jobType", "createdAt");
