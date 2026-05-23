-- CreateEnum for document types
CREATE TYPE "DocumentType" AS ENUM ('file', 'folder', 'link');

-- CreateEnum for storage provider
CREATE TYPE "StorageProvider" AS ENUM ('local', 's3', 'gcs', 'azure');

-- Create Document table
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "DocumentType" NOT NULL DEFAULT 'file',
    "mimeType" TEXT,
    "size" INTEGER,
    "path" TEXT,
    "url" TEXT,
    "storageProvider" "StorageProvider" NOT NULL DEFAULT 'local',
    "parentId" TEXT,
    "workspaceId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "tags" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- Create DocumentVersion table for versioning
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "size" INTEGER,
    "path" TEXT,
    "uploadedById" TEXT NOT NULL,
    "changeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- Create DocumentShare table for sharing
CREATE TABLE "DocumentShare" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sharedWithId" TEXT,
    "shareToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "permissions" TEXT NOT NULL DEFAULT 'read',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "DocumentShare_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "Document_parentId_idx" ON "Document"("parentId");
CREATE INDEX "Document_workspaceId_idx" ON "Document"("workspaceId");
CREATE INDEX "Document_uploadedById_idx" ON "Document"("uploadedById");
CREATE INDEX "Document_type_idx" ON "Document"("type");
CREATE INDEX "Document_tags_idx" ON "Document" USING GIN("tags");

CREATE INDEX "DocumentVersion_documentId_idx" ON "DocumentVersion"("documentId");
CREATE INDEX "DocumentShare_documentId_idx" ON "DocumentShare"("documentId");
CREATE INDEX "DocumentShare_shareToken_idx" ON "DocumentShare"("shareToken");

-- Add foreign keys
ALTER TABLE "Document" ADD CONSTRAINT "Document_parentId_fkey" 
    FOREIGN KEY ("parentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    
ALTER TABLE "Document" ADD CONSTRAINT "Document_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" 
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" 
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_uploadedById_fkey" 
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentShare" ADD CONSTRAINT "DocumentShare_documentId_fkey" 
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    
ALTER TABLE "DocumentShare" ADD CONSTRAINT "DocumentShare_sharedWithId_fkey" 
    FOREIGN KEY ("sharedWithId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraint for document versions
CREATE UNIQUE INDEX "DocumentVersion_documentId_version_key" ON "DocumentVersion"("documentId", "version");
