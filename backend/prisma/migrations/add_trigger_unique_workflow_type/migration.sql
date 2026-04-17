-- AddUniqueConstraint
ALTER TABLE "Trigger" ADD CONSTRAINT "Trigger_workflowId_type_key" UNIQUE ("workflowId", "type");
