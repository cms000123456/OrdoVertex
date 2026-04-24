export {};

/**
 * SMB/CIFS Integration Tests
 *
 * Verifies the SMB credential type, node registry entries, and end-to-end
 * file operations (upload, list, download, move, delete) executed via the
 * workflow engine against the ordovertex-test-samba container.
 *
 * The Samba container must be on the same docker network as the worker so
 * that the worker can reach it at hostname "samba".  Start the full stack
 * (including the samba service) with:
 *
 *   docker compose up -d --build
 *
 * Run these tests with:
 *
 *   npm test -- smb.test.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

// SMB server reachable by the worker container over the docker network
const SMB_HOST = 'samba';
const SMB_SHARE = 'testshare';
const SMB_USER = 'testuser';
const SMB_PASS = 'testpassword';

if (!TEST_EMAIL || !TEST_PASSWORD) {
  throw new Error('TEST_EMAIL and TEST_PASSWORD must be set in test/.env');
}

let authToken: string;

// IDs of resources created during tests — used for cleanup
const createdCredentialIds: string[] = [];
const createdWorkflowIds: string[] = [];

const api = async (
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<{ status: number; body: any }> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const responseBody = await res.json().catch(() => null);
  return { status: res.status, body: responseBody };
};

/**
 * Poll GET /api/executions?workflowId until the most-recent execution
 * reaches a terminal state.  The queue job ID returned by /execute is not
 * the same as the DB UUID used by GET /api/executions/:id, so we query by
 * workflowId instead.
 */
const waitForExecution = async (
  workflowId: string,
  maxWaitMs = 20000
): Promise<any> => {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 800));
    const { status, body } = await api(
      'GET',
      `/api/executions?workflowId=${workflowId}`,
      undefined,
      authToken
    );
    if (status !== 200) continue;
    const execs: any[] = body?.data?.executions ?? [];
    if (execs.length === 0) continue;
    // Most recent first
    const latest = execs[0];
    if (latest.status !== 'running') {
      // Fetch full record with nodeExecutions
      const { body: full } = await api(
        'GET',
        `/api/executions/${latest.id}`,
        undefined,
        authToken
      );
      return full?.data ?? latest;
    }
  }
  throw new Error(`Execution for workflow ${workflowId} did not finish within ${maxWaitMs}ms`);
};

/** Read testuser.keytab from the samba-dc container and return it as base64. */
const getDcKeytabBase64 = (): string => {
  const { execSync } = require('child_process');
  return execSync(
    'docker exec ordovertex-test-samba-dc base64 -w0 /keytabs/testuser.keytab'
  ).toString().trim();
};

/** Create a minimal two-node workflow (manual trigger → SMB action) and return its ID. */
const createSmbWorkflow = async (
  workflowName: string,
  smbParams: Record<string, unknown>
): Promise<string> => {
  const { status, body } = await api(
    'POST',
    '/api/workflows',
    {
      name: workflowName,
      nodes: [
        {
          id: 'trigger-1',
          type: 'manualTrigger',
          name: 'Manual Trigger',
          position: { x: 100, y: 200 },
          parameters: {},
        },
        {
          id: 'smb-1',
          type: 'smb',
          name: 'SMB Action',
          position: { x: 400, y: 200 },
          parameters: {
            useCredential: false,
            host: SMB_HOST,
            share: SMB_SHARE,
            domain: '',
            username: SMB_USER,
            password: SMB_PASS,
            ...smbParams,
          },
        },
      ],
      connections: [{ source: 'trigger-1', target: 'smb-1' }],
    },
    authToken
  );

  expect([200, 201]).toContain(status);
  const workflowId = body?.data?.id as string;
  createdWorkflowIds.push(workflowId);
  return workflowId;
};

/** Execute a workflow and return the completed execution record. */
const runWorkflow = async (workflowId: string): Promise<any> => {
  const { status, body } = await api(
    'POST',
    `/api/workflows/${workflowId}/execute`,
    {},
    authToken
  );
  expect([200, 202]).toContain(status);
  expect(body?.success).toBe(true);
  return waitForExecution(workflowId);
};

// ---------------------------------------------------------------------------

beforeAll(async () => {
  const { status, body } = await api('POST', '/api/auth/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (status !== 200 || !body?.data?.token) {
    throw new Error(`Login failed (${status}): ${JSON.stringify(body)}`);
  }

  authToken = body.data.token;
});

afterAll(async () => {
  for (const id of createdWorkflowIds) {
    await api('DELETE', `/api/workflows/${id}`, undefined, authToken);
  }
  for (const id of createdCredentialIds) {
    await api('DELETE', `/api/credentials/${id}`, undefined, authToken);
  }
});

// ---------------------------------------------------------------------------

describe('SMB/CIFS credential type', () => {
  let credentialId: string;

  test('GET /api/credentials/types includes smb with correct fields', async () => {
    const { status, body } = await api(
      'GET',
      '/api/credentials/types',
      undefined,
      authToken
    );
    expect(status).toBe(200);
    expect(body?.success).toBe(true);

    // types/list returns { data: { types: { <typeName>: { name, fields, ... } } } }
    const typesMap: Record<string, any> = body?.data?.types ?? {};
    const smb = typesMap['smb'];
    expect(smb).toBeDefined();
    expect(smb.name).toMatch(/smb/i);

    const fieldNames = smb.fields.map((f: any) => f.name);
    expect(fieldNames).toContain('host');
    expect(fieldNames).toContain('share');
    expect(fieldNames).toContain('username');
    expect(fieldNames).toContain('password');
  });

  test('POST /api/credentials creates an smb credential', async () => {
    const { status, body } = await api(
      'POST',
      '/api/credentials',
      {
        name: '[smoke-test] SMB cred',
        type: 'smb',
        data: {
          host: SMB_HOST,
          share: SMB_SHARE,
          domain: 'WORKGROUP',
          username: SMB_USER,
          password: SMB_PASS,
        },
      },
      authToken
    );
    expect([200, 201]).toContain(status);
    expect(body?.success).toBe(true);

    credentialId = body?.data?.credential?.id ?? body?.data?.id;
    expect(credentialId).toBeDefined();
    createdCredentialIds.push(credentialId);
  });

  test('GET /api/credentials lists the created smb credential', async () => {
    const { status, body } = await api(
      'GET',
      '/api/credentials',
      undefined,
      authToken
    );
    expect(status).toBe(200);
    // credentials list returns { data: { credentials: [...] } }
    const creds: any[] = body?.data?.credentials ?? [];
    const found = creds.find((c: any) => c.id === credentialId);
    expect(found).toBeDefined();
    expect(found.type).toBe('smb');
    // Sensitive fields must not be returned
    expect(found.data?.password).toBeUndefined();
  });

  test('DELETE /api/credentials/:id removes the credential', async () => {
    const { status, body } = await api(
      'DELETE',
      `/api/credentials/${credentialId}`,
      undefined,
      authToken
    );
    expect(status).toBe(200);
    expect(body?.success).toBe(true);
    // Remove from cleanup list so afterAll doesn't try again
    const idx = createdCredentialIds.indexOf(credentialId);
    if (idx !== -1) createdCredentialIds.splice(idx, 1);
  });

  test('POST /api/credentials rejects unknown smb field types', async () => {
    const { status } = await api(
      'POST',
      '/api/credentials',
      {
        name: '[smoke-test] bad type',
        type: 'smb_nonexistent',
        data: { host: 'x', share: 'y', username: 'u', password: 'p' },
      },
      authToken
    );
    expect(status).toBe(400);
  });
});

// ---------------------------------------------------------------------------

describe('SMB/CIFS node registry', () => {
  test('GET /api/nodes includes the smb action node', async () => {
    const { status, body } = await api('GET', '/api/nodes', undefined, authToken);
    expect(status).toBe(200);
    const nodes: any[] = body?.data ?? [];
    const smb = nodes.find((n: any) => n.name === 'smb');
    expect(smb).toBeDefined();
    expect(smb.displayName).toMatch(/smb/i);
    expect(smb.category).toBe('Actions');
  });

  test('GET /api/nodes includes the smbTrigger node', async () => {
    const { status, body } = await api('GET', '/api/nodes', undefined, authToken);
    expect(status).toBe(200);
    const nodes: any[] = body?.data ?? [];
    const trigger = nodes.find((n: any) => n.name === 'smbTrigger');
    expect(trigger).toBeDefined();
    expect(trigger.displayName).toMatch(/smb/i);
    expect(trigger.category).toBe('Triggers');
  });
});

// ---------------------------------------------------------------------------

describe('SMB/CIFS end-to-end operations', () => {
  const testFileName = `smoke-test-${Date.now()}.txt`;
  const testFileContent = 'ordovertex smb smoke test';

  test(
    'upload a file to the share',
    async () => {
      const workflowId = await createSmbWorkflow('[smoke-test] SMB upload', {
        operation: 'upload',
        remotePath: testFileName,
        data: testFileContent,
        binary: false,
      });

      const execution = await runWorkflow(workflowId);
      expect(execution.status).toBe('success');

      const nodeResults: any[] = execution.nodeExecutions ?? [];
      const smbNode = nodeResults.find((n: any) => n.nodeType === 'smb');
      expect(smbNode?.output?.[0]?.json?.uploaded).toBe(true);
      expect(smbNode?.output?.[0]?.json?.remotePath).toBe(testFileName);
    },
    30000
  );

  test(
    'list directory shows the uploaded file',
    async () => {
      const workflowId = await createSmbWorkflow('[smoke-test] SMB list', {
        operation: 'list',
        remotePath: '',
      });

      const execution = await runWorkflow(workflowId);
      expect(execution.status).toBe('success');

      const nodeResults: any[] = execution.nodeExecutions ?? [];
      const smbNode = nodeResults.find((n: any) => n.nodeType === 'smb');
      const files: string[] = smbNode?.output?.[0]?.json?.files ?? [];
      expect(files).toContain(testFileName);
    },
    30000
  );

  test(
    'download the file and verify content',
    async () => {
      const workflowId = await createSmbWorkflow('[smoke-test] SMB download', {
        operation: 'download',
        remotePath: testFileName,
        binary: false,
      });

      const execution = await runWorkflow(workflowId);
      expect(execution.status).toBe('success');

      const nodeResults: any[] = execution.nodeExecutions ?? [];
      const smbNode = nodeResults.find((n: any) => n.nodeType === 'smb');
      expect(smbNode?.output?.[0]?.json?.data).toBe(testFileContent);
    },
    30000
  );

  test(
    'move/rename the file',
    async () => {
      const renamed = `renamed-${testFileName}`;
      const workflowId = await createSmbWorkflow('[smoke-test] SMB move', {
        operation: 'move',
        remotePath: testFileName,
        newPath: renamed,
      });

      const execution = await runWorkflow(workflowId);
      expect(execution.status).toBe('success');

      const nodeResults: any[] = execution.nodeExecutions ?? [];
      const smbNode = nodeResults.find((n: any) => n.nodeType === 'smb');
      expect(smbNode?.output?.[0]?.json?.moved).toBe(true);
      expect(smbNode?.output?.[0]?.json?.to).toBe(renamed);
    },
    30000
  );

  test(
    'delete the renamed file',
    async () => {
      const renamed = `renamed-${testFileName}`;
      const workflowId = await createSmbWorkflow('[smoke-test] SMB delete', {
        operation: 'delete',
        remotePath: renamed,
      });

      const execution = await runWorkflow(workflowId);
      expect(execution.status).toBe('success');

      const nodeResults: any[] = execution.nodeExecutions ?? [];
      const smbNode = nodeResults.find((n: any) => n.nodeType === 'smb');
      expect(smbNode?.output?.[0]?.json?.deleted).toBe(true);
    },
    30000
  );

  test(
    'create a directory',
    async () => {
      const dirName = `smoke-dir-${Date.now()}`;
      const workflowId = await createSmbWorkflow('[smoke-test] SMB mkdir', {
        operation: 'mkdir',
        remotePath: dirName,
      });

      const execution = await runWorkflow(workflowId);
      expect(execution.status).toBe('success');

      const nodeResults: any[] = execution.nodeExecutions ?? [];
      const smbNode = nodeResults.find((n: any) => n.nodeType === 'smb');
      expect(smbNode?.output?.[0]?.json?.created).toBe(true);
    },
    30000
  );

  test(
    'execution fails with SMB error when file does not exist',
    async () => {
      const workflowId = await createSmbWorkflow('[smoke-test] SMB missing file', {
        operation: 'download',
        remotePath: 'does-not-exist-xyz.txt',
        binary: false,
      });

      const execution = await runWorkflow(workflowId);
      // The executor does not support continueOnFail, so the workflow fails
      expect(execution.status).toBe('failed');
      expect(execution.error).toMatch(/OBJECT_NAME_NOT_FOUND|not found/i);
    },
    30000
  );
});

// ---------------------------------------------------------------------------

/** Create a workflow that uses a saved credential (useCredential: true). */
const createSmbWorkflowWithCredential = async (
  workflowName: string,
  credentialId: string,
  smbParams: Record<string, unknown>
): Promise<string> => {
  const { status, body } = await api(
    'POST',
    '/api/workflows',
    {
      name: workflowName,
      nodes: [
        {
          id: 'trigger-1',
          type: 'manualTrigger',
          name: 'Manual Trigger',
          position: { x: 100, y: 200 },
          parameters: {},
        },
        {
          id: 'smb-1',
          type: 'smb',
          name: 'SMB Action',
          position: { x: 400, y: 200 },
          parameters: {
            useCredential: true,
            credentialId,
            ...smbParams,
          },
        },
      ],
      connections: [{ source: 'trigger-1', target: 'smb-1' }],
    },
    authToken
  );
  expect([200, 201]).toContain(status);
  const workflowId = body?.data?.id as string;
  createdWorkflowIds.push(workflowId);
  return workflowId;
};

// ---------------------------------------------------------------------------

describe('SMB/CIFS Kerberos authentication', () => {
  const KRB_HOST = 'samba-dc';
  const KRB_SHARE = 'dc-testshare';
  const KRB_PRINCIPAL = 'testuser@ORDOVERTEX.TEST';

  let krbCredentialId: string;
  let dcAvailable = false;

  beforeAll(() => {
    try {
      getDcKeytabBase64(); // throws if container not running or keytab missing
      dcAvailable = true;
    } catch {
      console.warn('samba-dc not ready — skipping Kerberos tests');
    }
  });

  const skipIfUnavailable = () => {
    if (!dcAvailable) pending();
  };

  test('POST /api/credentials creates a Kerberos SMB credential', async () => {
    skipIfUnavailable();
    const keytab = getDcKeytabBase64();
    const { status, body } = await api(
      'POST',
      '/api/credentials',
      {
        name: '[smoke-test] SMB Kerberos',
        type: 'smb',
        data: { host: KRB_HOST, share: KRB_SHARE, authType: 'kerberos', principal: KRB_PRINCIPAL, keytab },
      },
      authToken
    );
    expect([200, 201]).toContain(status);
    krbCredentialId = body?.data?.credential?.id ?? body?.data?.id;
    expect(krbCredentialId).toBeDefined();
    createdCredentialIds.push(krbCredentialId);
  });

  const krbFile = `krb-smoke-${Date.now()}.txt`;
  const krbContent = 'ordovertex kerberos smoke test';

  test('upload via Kerberos', async () => {
    skipIfUnavailable();
    const workflowId = await createSmbWorkflowWithCredential(
      '[smoke-test] KRB upload',
      krbCredentialId,
      { operation: 'upload', remotePath: krbFile, data: krbContent, binary: false }
    );
    const execution = await runWorkflow(workflowId);
    expect(execution.status).toBe('success');
    const smbNode = (execution.nodeExecutions ?? []).find((n: any) => n.nodeType === 'smb');
    expect(smbNode?.output?.[0]?.json?.uploaded).toBe(true);
  }, 60000);

  test('list via Kerberos shows uploaded file', async () => {
    skipIfUnavailable();
    const workflowId = await createSmbWorkflowWithCredential(
      '[smoke-test] KRB list',
      krbCredentialId,
      { operation: 'list', remotePath: '' }
    );
    const execution = await runWorkflow(workflowId);
    expect(execution.status).toBe('success');
    const smbNode = (execution.nodeExecutions ?? []).find((n: any) => n.nodeType === 'smb');
    expect(smbNode?.output?.[0]?.json?.files).toContain(krbFile);
  }, 60000);

  test('download via Kerberos and verify content', async () => {
    skipIfUnavailable();
    const workflowId = await createSmbWorkflowWithCredential(
      '[smoke-test] KRB download',
      krbCredentialId,
      { operation: 'download', remotePath: krbFile, binary: false }
    );
    const execution = await runWorkflow(workflowId);
    expect(execution.status).toBe('success');
    const smbNode = (execution.nodeExecutions ?? []).find((n: any) => n.nodeType === 'smb');
    expect(smbNode?.output?.[0]?.json?.data).toBe(krbContent);
  }, 60000);

  test('delete via Kerberos', async () => {
    skipIfUnavailable();
    const workflowId = await createSmbWorkflowWithCredential(
      '[smoke-test] KRB delete',
      krbCredentialId,
      { operation: 'delete', remotePath: krbFile }
    );
    const execution = await runWorkflow(workflowId);
    expect(execution.status).toBe('success');
    const smbNode = (execution.nodeExecutions ?? []).find((n: any) => n.nodeType === 'smb');
    expect(smbNode?.output?.[0]?.json?.deleted).toBe(true);
  }, 60000);
});
