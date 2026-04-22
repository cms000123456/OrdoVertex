import { Router } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../utils/auth';

const authenticateToken = authMiddleware;
import { encryptJSON, decryptJSON } from '../utils/encryption';
import { getVaultSecret, validateVaultConnection, VaultConfig } from '../utils/vault';
import logger from '../utils/logger';
import { asyncHandler } from 'utils/async-handler';

const router = Router();

// Helper to verify user exists (handles case where DB was reset but token is still valid)
async function verifyUserExists(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });
  return user !== null;
}

// Success response helper
const successResponse = (res: any, data: any, status = 200) => {
  res.status(status).json({ success: true, data });
};

// Error response helper
const errorResponse = (res: any, message: string, status = 400) => {
  res.status(status).json({ success: false, error: message });
};

/**
 * @route GET /api/credentials
 * @desc List all credentials for the authenticated user
 */
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { type, workspaceId, includeShared } = req.query;

    const where: any = {
      ...(type && { type: type as string }),
      ...(workspaceId && { workspaceId: workspaceId as string })
    };

    // If not filtering by workspace, get personal + shared credentials
    if (!workspaceId) {
      if (includeShared === 'true') {
        where.OR = [
          { userId },
          { workspace: { members: { some: { userId } } } }
        ];
      } else {
        where.userId = userId;
      }
    }

    const credentials = await prisma.credential.findMany({
      where,
      include: {
        workspace: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Return credentials without sensitive data
    const sanitizedCredentials = credentials.map(cred => ({
      id: cred.id,
      name: cred.name,
      type: cred.type,
      workspaceId: cred.workspaceId,
      workspaceName: cred.workspace?.name,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt,
      lastUsed: cred.lastUsed
    }));

    return successResponse(res, { credentials: sanitizedCredentials });
  } catch (error: any) {
    logger.error('Error listing credentials:', error);
    return errorResponse(res, 'Failed to list credentials', 500);
  }
});

/**
 * @route GET /api/credentials/:id
 * @desc Get a specific credential (without sensitive data)
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const credential = await prisma.credential.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { workspace: { members: { some: { userId } } } }
        ]
      },
      include: {
        workspace: {
          select: { id: true, name: true }
        }
      }
    });

    if (!credential) {
      return errorResponse(res, 'Credential not found', 404);
    }

    // Decrypt data to get non-sensitive fields only
    let data: Record<string, any> = {};
    try {
      data = decryptJSON(credential.data, credential.iv);
    } catch (e) {
      logger.error('Error decrypting credential:', e);
    }

    // Return only non-sensitive fields (mask sensitive values)
    const sanitizedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && (
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('key') ||
        key.toLowerCase().includes('token')
      )) {
        sanitizedData[key] = '••••••••';
      } else {
        sanitizedData[key] = value;
      }
    }

    return successResponse(res, {
      credential: {
        id: credential.id,
        name: credential.name,
        type: credential.type,
        workspaceId: credential.workspaceId,
        workspaceName: credential.workspace?.name,
        data: sanitizedData,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt,
        lastUsed: credential.lastUsed
      }
    });
  } catch (error: any) {
    logger.error('Error getting credential:', error);
    return errorResponse(res, 'Failed to get credential', 500);
  }
});

/**
 * @route POST /api/credentials
 * @desc Create a new credential
 */
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { name, type, data } = req.body;

    logger.info('Creating credential:', { name, type, dataKeys: Object.keys(data || {}) });

    if (!name || !type || !data) {
      logger.info('Validation failed:', { name: !!name, type: !!type, data: !!data });
      return errorResponse(res, 'Name, type, and data are required');
    }

    // Verify user exists before creating credential
    if (!(await verifyUserExists(userId))) {
      return errorResponse(res, 'User not found. Please log out and log in again.', 401);
    }

    // Validate credential type
    const validTypes = ['database', 'http', 'oauth2', 'apiKey', 'ssh', 'generic', 'hashicorpVault', 'openai', 'anthropic', 'gemini', 'kimi', 'smtp', 'sftp', 'smb', 'aws', 'ldap', 'webhook'];
    if (!validTypes.includes(type)) {
      return errorResponse(res, `Invalid credential type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Encrypt the sensitive data
    let encrypted, iv;
    try {
      const encryptionResult = encryptJSON(data);
      encrypted = encryptionResult.encrypted;
      iv = encryptionResult.iv;
      logger.info('Encryption successful');
    } catch (encryptError: any) {
      logger.error('Encryption failed:', encryptError);
      return errorResponse(res, `Encryption failed: ${encryptError.message}`, 500);
    }

    const { workspaceId } = req.body;
    
    // Check workspace permissions if workspaceId provided
    if (workspaceId) {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          OR: [
            { ownerId: userId },
            { members: { some: { userId, role: { in: ['admin', 'editor'] } } } }
          ]
        }
      });
      if (!workspace) {
        return errorResponse(res, 'Invalid workspace or insufficient permissions');
      }
    }

    logger.info('Creating credential in DB:', { name, type, userId, workspaceId: workspaceId || null });
    
    const credential = await prisma.credential.create({
      data: {
        name,
        type,
        data: encrypted,
        iv,
        userId,
        workspaceId: workspaceId || null
      }
    });

    logger.info('Credential created:', credential.id);

    return successResponse(res, {
      credential: {
        id: credential.id,
        name: credential.name,
        type: credential.type,
        createdAt: credential.createdAt
      }
    }, 201);
  } catch (error: any) {
    logger.error('Error creating credential:', error);
    logger.error('Error details:', error.message, error.stack);
    return errorResponse(res, `Failed to create credential: ${error.message}`, 500);
  }
});

/**
 * @route PUT /api/credentials/:id
 * @desc Update a credential
 */
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, data } = req.body;

    const existing = await prisma.credential.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return errorResponse(res, 'Credential not found', 404);
    }

    const updateData: any = {};

    if (name) {
      updateData.name = name;
    }

    if (data) {
      // Re-encrypt the data
      const { encrypted, iv } = encryptJSON(data);
      updateData.data = encrypted;
      updateData.iv = iv;
    }

    updateData.updatedAt = new Date();

    const credential = await prisma.credential.update({
      where: { id },
      data: updateData
    });

    return successResponse(res, {
      credential: {
        id: credential.id,
        name: credential.name,
        type: credential.type,
        updatedAt: credential.updatedAt
      }
    });
  } catch (error: any) {
    logger.error('Error updating credential:', error);
    return errorResponse(res, 'Failed to update credential', 500);
  }
});

/**
 * @route DELETE /api/credentials/:id
 * @desc Delete a credential
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.credential.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return errorResponse(res, 'Credential not found', 404);
    }

    await prisma.credential.delete({
      where: { id }
    });

    return successResponse(res, { message: 'Credential deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting credential:', error);
    return errorResponse(res, 'Failed to delete credential', 500);
  }
});

/**
 * @route POST /api/credentials/:id/decrypt
 * @desc Decrypt and return credential data (for node execution)
 * @access Internal use only - requires additional validation
 */
router.post('/:id/decrypt', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const credential = await prisma.credential.findFirst({
      where: { id, userId }
    });

    if (!credential) {
      return errorResponse(res, 'Credential not found', 404);
    }

    // Handle HashiCorp Vault credentials differently
    if (credential.type === 'hashicorpVault') {
      const vaultConfig = decryptJSON(credential.data, credential.iv) as VaultConfig;
      
      try {
        const secretData = await getVaultSecret(vaultConfig);
        
        // Update last used timestamp
        await prisma.credential.update({
          where: { id },
          data: { lastUsed: new Date() }
        });

        return successResponse(res, {
          credential: {
            id: credential.id,
            name: credential.name,
            type: credential.type,
            data: secretData,
            source: 'hashicorpVault'
          }
        });
      } catch (vaultError: any) {
        return errorResponse(res, `Vault error: ${vaultError.message}`, 502);
      }
    }

    // Decrypt regular credential data
    const data = decryptJSON(credential.data, credential.iv);

    // Update last used timestamp
    await prisma.credential.update({
      where: { id },
      data: { lastUsed: new Date() }
    });

    return successResponse(res, {
      credential: {
        id: credential.id,
        name: credential.name,
        type: credential.type,
        data
      }
    });
  } catch (error: any) {
    logger.error('Error decrypting credential:', error);
    return errorResponse(res, 'Failed to decrypt credential', 500);
  }
});

/**
 * @route POST /api/credentials/test-vault
 * @desc Test HashiCorp Vault connection
 */
router.post('/test-vault', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { url, token, namespace } = req.body;

    const isValid = await validateVaultConnection({ url, token, namespace });

    if (isValid) {
      return successResponse(res, { message: 'Vault connection successful' });
    } else {
      return errorResponse(res, 'Failed to connect to Vault - check URL and token', 400);
    }
  } catch (error: any) {
    logger.error('Vault test error:', error);
    return errorResponse(res, `Vault connection failed: ${error.message}`, 500);
  }
});

/**
 * @route GET /api/credentials/types
 * @desc Get available credential types and their required fields
 */
router.get('/types/list', authenticateToken, async (req: AuthRequest, res) => {
  const credentialTypes = {
    database: {
      name: 'Database',
      description: 'Database connection credentials',
      fields: [
        { name: 'host', type: 'string', displayName: 'Host', required: true },
        { name: 'port', type: 'number', displayName: 'Port', required: false },
        { name: 'database', type: 'string', displayName: 'Database', required: true },
        { name: 'user', type: 'string', displayName: 'Username', required: true },
        { name: 'password', type: 'string', displayName: 'Password', required: true, sensitive: true },
        { name: 'ssl', type: 'boolean', displayName: 'SSL', required: false }
      ]
    },
    http: {
      name: 'HTTP Basic Auth',
      description: 'HTTP Basic Authentication',
      fields: [
        { name: 'username', type: 'string', displayName: 'Username', required: true },
        { name: 'password', type: 'string', displayName: 'Password', required: true, sensitive: true }
      ]
    },
    apiKey: {
      name: 'API Key',
      description: 'API Key authentication',
      fields: [
        { name: 'key', type: 'string', displayName: 'API Key', required: true, sensitive: true },
        { name: 'headerName', type: 'string', displayName: 'Header Name', required: false, default: 'X-API-Key' }
      ]
    },
    oauth2: {
      name: 'OAuth 2.0',
      description: 'OAuth 2.0 credentials',
      fields: [
        { name: 'clientId', type: 'string', displayName: 'Client ID', required: true },
        { name: 'clientSecret', type: 'string', displayName: 'Client Secret', required: true, sensitive: true },
        { name: 'accessToken', type: 'string', displayName: 'Access Token', required: false, sensitive: true },
        { name: 'refreshToken', type: 'string', displayName: 'Refresh Token', required: false, sensitive: true }
      ]
    },
    ssh: {
      name: 'SSH',
      description: 'SSH credentials',
      fields: [
        { name: 'username', type: 'string', displayName: 'Username', required: true },
        { name: 'password', type: 'string', displayName: 'Password', required: false, sensitive: true },
        { name: 'privateKey', type: 'string', displayName: 'Private Key', required: false, sensitive: true, multiline: true }
      ]
    },
    generic: {
      name: 'Generic',
      description: 'Generic key-value credentials',
      fields: [
        { name: 'key', type: 'string', displayName: 'Key', required: true },
        { name: 'value', type: 'string', displayName: 'Value', required: true, sensitive: true }
      ]
    },
    hashicorpVault: {
      name: 'HashiCorp Vault',
      description: 'Fetch secrets from HashiCorp Vault',
      fields: [
        { name: 'url', type: 'string', displayName: 'Vault URL', required: true, placeholder: 'https://vault.example.com:8200' },
        { name: 'token', type: 'string', displayName: 'Vault Token', required: true, sensitive: true },
        { name: 'namespace', type: 'string', displayName: 'Namespace (Enterprise)', required: false, placeholder: 'admin' },
        { name: 'mountPath', type: 'string', displayName: 'Secrets Engine Path', required: true, default: 'secret', placeholder: 'secret' },
        { name: 'secretPath', type: 'string', displayName: 'Secret Path', required: true, placeholder: 'database/prod' }
      ]
    },
    openai: {
      name: 'OpenAI API',
      description: 'OpenAI API key for GPT models',
      fields: [
        { name: 'apiKey', type: 'string', displayName: 'API Key', required: true, sensitive: true, placeholder: 'sk-...' }
      ]
    },
    anthropic: {
      name: 'Anthropic Claude',
      description: 'Anthropic API key for Claude models',
      fields: [
        { name: 'apiKey', type: 'string', displayName: 'API Key', required: true, sensitive: true, placeholder: 'sk-ant-...' }
      ]
    },
    gemini: {
      name: 'Google Gemini',
      description: 'Google Gemini API key for Gemini models',
      fields: [
        { name: 'apiKey', type: 'string', displayName: 'API Key', required: true, sensitive: true, placeholder: 'AIza...' }
      ]
    },
    kimi: {
      name: 'Kimi AI (Moonshot)',
      description: 'Moonshot AI API key for Kimi models',
      fields: [
        { name: 'apiKey', type: 'string', displayName: 'API Key', required: true, sensitive: true, placeholder: 'sk-...' },
        { name: 'baseUrl', type: 'string', displayName: 'Base URL', required: false, placeholder: 'https://api.moonshot.cn/v1', default: 'https://api.moonshot.cn/v1' }
      ]
    },
    smtp: {
      name: 'SMTP Server',
      description: 'SMTP credentials for sending emails',
      fields: [
        { name: 'host', type: 'string', displayName: 'Host', required: true, placeholder: 'smtp.gmail.com' },
        { name: 'port', type: 'number', displayName: 'Port', required: true, default: 587 },
        { name: 'user', type: 'string', displayName: 'Username', required: true },
        { name: 'password', type: 'string', displayName: 'Password', required: true, sensitive: true },
        { name: 'secure', type: 'boolean', displayName: 'Use TLS (Port 465)', required: false, default: false }
      ]
    },
    sftp: {
      name: 'SFTP/SSH Server',
      description: 'SFTP credentials for file transfers',
      fields: [
        { name: 'host', type: 'string', displayName: 'Host', required: true, placeholder: 'sftp.example.com' },
        { name: 'port', type: 'number', displayName: 'Port', required: true, default: 22 },
        { name: 'username', type: 'string', displayName: 'Username', required: true },
        { name: 'password', type: 'string', displayName: 'Password', required: false, sensitive: true },
        { name: 'privateKey', type: 'string', displayName: 'Private Key', required: false, sensitive: true, multiline: true },
        { name: 'passphrase', type: 'string', displayName: 'Key Passphrase', required: false, sensitive: true }
      ]
    },
    smb: {
      name: 'SMB/CIFS Share',
      description: 'SMB/CIFS credentials for Windows or Samba file shares (NTLMv2 or Kerberos)',
      fields: [
        { name: 'host', type: 'string', displayName: 'Host', required: true, placeholder: '192.168.1.10' },
        { name: 'share', type: 'string', displayName: 'Share Name', required: true, placeholder: 'shared' },
        { name: 'authType', type: 'string', displayName: 'Auth Type', required: false, placeholder: 'ntlm (default) or kerberos' },
        { name: 'domain', type: 'string', displayName: 'Domain (NTLMv2)', required: false, placeholder: 'WORKGROUP' },
        { name: 'username', type: 'string', displayName: 'Username (NTLMv2)', required: false },
        { name: 'password', type: 'string', displayName: 'Password (NTLMv2)', required: false, sensitive: true },
        { name: 'principal', type: 'string', displayName: 'Principal (Kerberos)', required: false, placeholder: 'user@REALM.COM' },
        { name: 'keytab', type: 'string', displayName: 'Keytab base64 (Kerberos)', required: false, sensitive: true }
      ]
    },
    aws: {
      name: 'AWS Credentials',
      description: 'AWS Access Key for S3 and other services',
      fields: [
        { name: 'accessKeyId', type: 'string', displayName: 'Access Key ID', required: true },
        { name: 'secretAccessKey', type: 'string', displayName: 'Secret Access Key', required: true, sensitive: true }
      ]
    },
    ldap: {
      name: 'LDAP Server',
      description: 'LDAP/Active Directory credentials',
      fields: [
        { name: 'url', type: 'string', displayName: 'Server URL', required: true, placeholder: 'ldap://ad.example.com:389' },
        { name: 'bindDn', type: 'string', displayName: 'Bind DN', required: true, placeholder: 'cn=admin,dc=example,dc=com' },
        { name: 'password', type: 'string', displayName: 'Password', required: true, sensitive: true }
      ]
    },
    webhook: {
      name: 'Webhook',
      description: 'Webhook URL credential (e.g. Google Chat, Slack)',
      fields: [
        { name: 'webhookUrl', type: 'string', displayName: 'Webhook URL', required: true, sensitive: false, placeholder: 'https://chat.googleapis.com/v1/spaces/...' },
        { name: 'description', type: 'string', displayName: 'Description', required: false, placeholder: 'e.g. Marketing Alerts' }
      ]
    }
  };

  return successResponse(res, { types: credentialTypes });
});

export default router;