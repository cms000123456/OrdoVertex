/**
 * Prod smoke tests — HTTP only, no direct DB access.
 *
 * Configure via test/.env:
 *   API_URL=https://your-prod-domain.com
 *   TEST_EMAIL=smoketest@example.com
 *   TEST_PASSWORD=your-test-password
 *
 * Run: npm test
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

if (!TEST_EMAIL || !TEST_PASSWORD) {
  throw new Error('TEST_EMAIL and TEST_PASSWORD must be set in test/.env');
}

let authToken: string;
let createdWorkflowId: string | null = null;

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
  if (createdWorkflowId) {
    await api('DELETE', `/api/workflows/${createdWorkflowId}`, undefined, authToken);
  }
});

describe('Health', () => {
  test('GET /health returns ok', async () => {
    const { status, body } = await api('GET', '/health');
    expect(status).toBe(200);
    expect(body?.status).toBe('ok');
  });
});

describe('Auth', () => {
  test('GET /api/auth/me returns current user', async () => {
    const { status, body } = await api('GET', '/api/auth/me', undefined, authToken);
    expect(status).toBe(200);
    expect(body?.success).toBe(true);
    expect(body?.data?.user?.email).toBe(TEST_EMAIL);
  });

  test('GET /api/auth/me rejects unauthenticated request', async () => {
    const { status } = await api('GET', '/api/auth/me');
    // 401 = no token, 429 = rate limited — both mean the request was rejected
    expect([401, 429]).toContain(status);
  });

  test('POST /api/auth/login rejects wrong password', async () => {
    // Use a non-existent email so failed attempts don't consume TEST_EMAIL's rate limit budget
    const { status } = await api('POST', '/api/auth/login', {
      email: 'nouser@smoke-test-invalid.example',
      password: 'definitely-wrong-password',
    });
    // 401 = bad credentials, 429 = rate limited after repeated failures
    expect([401, 429]).toContain(status);
  });
});

describe('Workflows', () => {
  test('GET /api/workflows returns list', async () => {
    const { status, body } = await api('GET', '/api/workflows', undefined, authToken);
    expect(status).toBe(200);
    expect(body?.success).toBe(true);
    expect(Array.isArray(body?.data?.workflows)).toBe(true);
    expect(body?.data?.pagination).toBeDefined();
  });

  test('POST /api/workflows creates a workflow', async () => {
    const { status, body } = await api(
      'POST',
      '/api/workflows',
      { name: '[smoke-test] delete-me', nodes: [], connections: [] },
      authToken
    );
    expect([200, 201]).toContain(status);
    expect(body?.success).toBe(true);
    createdWorkflowId = body?.data?.id ?? null;
  });

  test('GET /api/workflows/:id returns the created workflow', async () => {
    if (!createdWorkflowId) return;
    const { status, body } = await api(
      'GET',
      `/api/workflows/${createdWorkflowId}`,
      undefined,
      authToken
    );
    expect(status).toBe(200);
    expect(body?.data?.id).toBe(createdWorkflowId);
  });

  test('PATCH /api/workflows/:id updates the workflow', async () => {
    if (!createdWorkflowId) return;
    const { status, body } = await api(
      'PATCH',
      `/api/workflows/${createdWorkflowId}`,
      { name: '[smoke-test] updated' },
      authToken
    );
    expect(status).toBe(200);
    expect(body?.success).toBe(true);
  });

  test('GET /api/workflows rejects unauthenticated request', async () => {
    const { status } = await api('GET', '/api/workflows');
    expect(status).toBe(401);
  });
});

describe('Templates', () => {
  test('GET /api/templates returns list', async () => {
    const { status, body } = await api('GET', '/api/templates', undefined, authToken);
    expect(status).toBe(200);
    expect(body?.success).toBe(true);
    expect(Array.isArray(body?.data?.templates)).toBe(true);
  });

  test('GET /api/templates/categories/list returns categories', async () => {
    const { status, body } = await api(
      'GET',
      '/api/templates/categories/list',
      undefined,
      authToken
    );
    expect(status).toBe(200);
    expect(body?.success).toBe(true);
  });
});

describe('Nodes', () => {
  test('GET /api/nodes returns node list', async () => {
    const { status, body } = await api('GET', '/api/nodes', undefined, authToken);
    expect(status).toBe(200);
    expect(body?.success).toBe(true);
  });

  test('GET /api/nodes/categories returns categories', async () => {
    const { status, body } = await api(
      'GET',
      '/api/nodes/categories',
      undefined,
      authToken
    );
    expect(status).toBe(200);
    expect(body?.success).toBe(true);
  });
});

describe('Executions', () => {
  test('GET /api/executions returns list', async () => {
    const { status, body } = await api('GET', '/api/executions', undefined, authToken);
    expect(status).toBe(200);
    expect(body?.success).toBe(true);
  });

  test('GET /api/executions/stats returns stats', async () => {
    const { status, body } = await api(
      'GET',
      '/api/executions/stats',
      undefined,
      authToken
    );
    expect(status).toBe(200);
    expect(body?.success).toBe(true);
  });
});

describe('Credentials', () => {
  test('GET /api/credentials returns list', async () => {
    const { status, body } = await api('GET', '/api/credentials', undefined, authToken);
    expect(status).toBe(200);
    expect(body?.success).toBe(true);
  });

  test('GET /api/credentials/types returns types', async () => {
    const { status, body } = await api(
      'GET',
      '/api/credentials/types',
      undefined,
      authToken
    );
    expect(status).toBe(200);
    expect(body?.success).toBe(true);
    expect(body?.data?.types).toBeDefined();
  });
});

describe('API Keys', () => {
  test('GET /api/api-keys returns list for admin', async () => {
    const { status, body } = await api('GET', '/api/api-keys', undefined, authToken);
    expect(status).toBe(200);
    expect(body?.success).toBe(true);
  });
});
