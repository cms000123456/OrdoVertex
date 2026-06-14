-- Add hashed API key fields and index
ALTER TABLE "ApiKey" ADD COLUMN "keyHash" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN "keyPrefix" TEXT;

-- Make the plaintext key optional so new keys can be stored without it
ALTER TABLE "ApiKey" ALTER COLUMN "key" DROP NOT NULL;

-- Drop the unique constraint on the plaintext key
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_key_key";

-- Index for prefix-based lookup during authentication
CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");
