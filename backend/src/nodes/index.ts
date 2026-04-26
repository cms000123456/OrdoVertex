import { nodeRegistry } from './registry';

// Core nodes
import { manualTriggerNode } from './core/manual-trigger';
import { webhookNode } from './core/webhook';
import { scheduleTriggerNode } from './core/schedule';
import { stickyNoteNode } from './core/sticky-note';

// Trigger nodes (polling-based)
import { fileWatchTriggerNode } from './triggers/file-watch';
import { s3TriggerNode } from './triggers/s3-trigger';
import { sftpTriggerNode } from './triggers/sftp-trigger';
import { smbTriggerNode } from './triggers/smb-trigger';

// Action nodes
import { httpRequestNode } from './actions/http-request';
import { codeNode } from './actions/code';
import { setNode } from './actions/set';
import { ifNode } from './actions/if';
import { waitNode } from './actions/wait';
import { splitNode } from './actions/split';
import { aggregateNode } from './actions/aggregate';
import { sqlDatabaseNode } from './actions/sql-database';
import { sendEmailNode } from './actions/send-email';
import { csvNode } from './actions/csv';
import { webhookResponseNode } from './actions/webhook-response';
import { sftpNode } from './actions/sftp';
import { smbNode } from './actions/smb';
import { ldapNode } from './actions/ldap';

// Transform nodes
import { filterNode } from './actions/filter';
import { sortNode } from './actions/sort';
import { removeDuplicatesNode } from './actions/remove-duplicates';
import { dateTimeNode } from './actions/date-time';
import { stringOpsNode } from './actions/string-ops';
import { mathNode } from './actions/math';
import { renameFieldsNode } from './actions/rename-fields';
import { markdownNode } from './actions/markdown';

// AI nodes
import { aiAgentNode } from './actions/ai-agent';
import { aiEmbeddingNode } from './actions/ai-embedding';
import { aiVectorStoreNode } from './actions/ai-vector-store';
import { textSplitterNode } from './actions/text-splitter';
import { imageDisplayNode } from './actions/image-display';
import { textParserNode } from './actions/text-parser';
import { googleChatNode } from './actions/google-chat';
import { markdownViewerNode } from './actions/markdown-viewer';
import logger from '../utils/logger';

// Register all nodes
export function registerAllNodes() {
  // Core/Trigger nodes
  nodeRegistry.register(manualTriggerNode);
  nodeRegistry.register(webhookNode);
  nodeRegistry.register(scheduleTriggerNode);
  nodeRegistry.register(stickyNoteNode);

  // Polling-based triggers
  nodeRegistry.register(fileWatchTriggerNode);
  nodeRegistry.register(s3TriggerNode);
  nodeRegistry.register(sftpTriggerNode);
  nodeRegistry.register(smbTriggerNode);

  // Action nodes
  nodeRegistry.register(httpRequestNode);
  nodeRegistry.register(codeNode);
  nodeRegistry.register(setNode);
  nodeRegistry.register(ifNode);
  nodeRegistry.register(waitNode);
  nodeRegistry.register(splitNode);
  nodeRegistry.register(aggregateNode);
  nodeRegistry.register(sqlDatabaseNode);
  nodeRegistry.register(sendEmailNode);
  nodeRegistry.register(csvNode);
  nodeRegistry.register(webhookResponseNode);
  nodeRegistry.register(sftpNode);
  nodeRegistry.register(smbNode);
  nodeRegistry.register(ldapNode);

  // Transform nodes
  nodeRegistry.register(filterNode);
  nodeRegistry.register(sortNode);
  nodeRegistry.register(removeDuplicatesNode);
  nodeRegistry.register(dateTimeNode);
  nodeRegistry.register(stringOpsNode);
  nodeRegistry.register(mathNode);
  nodeRegistry.register(renameFieldsNode);
  nodeRegistry.register(markdownNode);

  // AI nodes
  nodeRegistry.register(aiAgentNode);
  nodeRegistry.register(aiEmbeddingNode);
  nodeRegistry.register(aiVectorStoreNode);
  nodeRegistry.register(textSplitterNode);
  nodeRegistry.register(imageDisplayNode);
  nodeRegistry.register(textParserNode);
  nodeRegistry.register(googleChatNode);
  nodeRegistry.register(markdownViewerNode);

  logger.info(`✅ Registered ${nodeRegistry.getAll().length} nodes`);
}

export { nodeRegistry };
