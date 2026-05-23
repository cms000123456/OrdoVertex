-- Remove duplicate Trigger rows keeping the most recent per workflowId+type
DELETE FROM "Trigger" a
USING "Trigger" b
WHERE a."createdAt" < b."createdAt"
  AND a."workflowId" = b."workflowId"
  AND a."type" = b."type";

-- AddUniqueConstraint
ALTER TABLE "Trigger" ADD CONSTRAINT "Trigger_workflowId_type_key" UNIQUE ("workflowId", "type");
