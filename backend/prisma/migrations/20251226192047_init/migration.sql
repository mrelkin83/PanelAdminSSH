-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "vps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 22,
    "username" TEXT NOT NULL DEFAULT 'root',
    "privateKey" TEXT,
    "password" TEXT,
    "location" TEXT,
    "provider" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "version" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ssh_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vpsId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxConnections" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ssh_users_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "vps" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vpsId" TEXT NOT NULL,
    "sshUserId" TEXT,
    "username" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "protocol" TEXT,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" DATETIME,
    "bytesIn" BIGINT DEFAULT 0,
    "bytesOut" BIGINT DEFAULT 0,
    CONSTRAINT "connections_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "vps" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "connections_sshUserId_fkey" FOREIGN KEY ("sshUserId") REFERENCES "ssh_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "action_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT,
    "vpsId" TEXT,
    "sshUserId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" TEXT,
    "errorMessage" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "action_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "action_logs_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "vps" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "action_logs_sshUserId_fkey" FOREIGN KEY ("sshUserId") REFERENCES "ssh_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "backups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vpsId" TEXT NOT NULL,
    "sshUserId" TEXT,
    "adminId" TEXT NOT NULL,
    "backupData" TEXT NOT NULL,
    "backupType" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restoredAt" DATETIME,
    CONSTRAINT "backups_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "vps" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "backups_sshUserId_fkey" FOREIGN KEY ("sshUserId") REFERENCES "ssh_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "backups_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "ssh_users_vpsId_idx" ON "ssh_users"("vpsId");

-- CreateIndex
CREATE INDEX "ssh_users_expiresAt_idx" ON "ssh_users"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ssh_users_vpsId_username_key" ON "ssh_users"("vpsId", "username");

-- CreateIndex
CREATE INDEX "connections_vpsId_idx" ON "connections"("vpsId");

-- CreateIndex
CREATE INDEX "connections_sshUserId_idx" ON "connections"("sshUserId");

-- CreateIndex
CREATE INDEX "connections_connectedAt_idx" ON "connections"("connectedAt");

-- CreateIndex
CREATE INDEX "action_logs_adminId_idx" ON "action_logs"("adminId");

-- CreateIndex
CREATE INDEX "action_logs_vpsId_idx" ON "action_logs"("vpsId");

-- CreateIndex
CREATE INDEX "action_logs_action_idx" ON "action_logs"("action");

-- CreateIndex
CREATE INDEX "action_logs_createdAt_idx" ON "action_logs"("createdAt");

-- CreateIndex
CREATE INDEX "backups_vpsId_idx" ON "backups"("vpsId");

-- CreateIndex
CREATE INDEX "backups_createdAt_idx" ON "backups"("createdAt");
