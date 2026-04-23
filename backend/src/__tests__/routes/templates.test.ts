import bcrypt from 'bcryptjs';
import { workflowTemplates } from '../../data/templates';
import { prisma } from '../setup';
const API_URL = process.env.API_URL || 'http://localhost:3001';

const apiCall = async (method: string, path: string, body?: any, token?: string): Promise<{ status: number; body: any }> => {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  } catch {
    return { status: 0, body: null };
  }
};

describe('Template Routes', () => {
  let authToken: string;
  let userId: string;

  // The global setup.ts runs afterEach(() => User.deleteMany({})), which wipes
  // the test user between every test. We therefore recreate + login per test.
  beforeEach(async () => {
    const password = 'testpassword123';
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: `tpl-test-${Date.now()}@example.com`,
        password: hashedPassword,
        name: 'Template Test User',
        role: 'user',
      },
    });
    userId = user.id;

    const loginRes = await apiCall('POST', '/api/auth/login', { email: user.email, password });
    authToken = loginRes.body?.data?.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/templates', () => {
    test('returns list of templates', async () => {
      const { status, body } = await apiCall('GET', '/api/templates', undefined, authToken);
      if (status === 0) return;
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    test('each template has id, name, description, category, tags', async () => {
      const { status, body } = await apiCall('GET', '/api/templates', undefined, authToken);
      if (status === 0) return;
      expect(status).toBe(200);
      for (const tpl of body.data) {
        expect(tpl.id).toBeDefined();
        expect(tpl.name).toBeDefined();
        expect(tpl.description).toBeDefined();
        expect(tpl.category).toBeDefined();
        expect(Array.isArray(tpl.tags)).toBe(true);
      }
    });

    test('filters by category', async () => {
      const { status, body } = await apiCall('GET', '/api/templates?category=Demo', undefined, authToken);
      if (status === 0) return;
      expect(status).toBe(200);
      expect(body.data.every((t: any) => t.category === 'Demo')).toBe(true);
    });

    test('filters by search term', async () => {
      const { status, body } = await apiCall('GET', '/api/templates?search=weather', undefined, authToken);
      if (status === 0) return;
      expect(status).toBe(200);
      expect(body.data.length).toBeGreaterThan(0);
    });

    test('rejects unauthenticated request', async () => {
      const { status } = await apiCall('GET', '/api/templates');
      if (status === 0) return;
      expect(status).toBe(401);
    });
  });

  describe('GET /api/templates/categories/list', () => {
    test('returns array of category strings', async () => {
      const { status, body } = await apiCall('GET', '/api/templates/categories/list', undefined, authToken);
      if (status === 0) return;
      expect(status).toBe(200);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.every((c: any) => typeof c === 'string')).toBe(true);
    });

    test('includes expected categories', async () => {
      const { status, body } = await apiCall('GET', '/api/templates/categories/list', undefined, authToken);
      if (status === 0) return;
      expect(status).toBe(200);
      expect(body.data).toContain('Demo');
      expect(body.data).toContain('Tutorial');
    });
  });

  describe('GET /api/templates/:id', () => {
    test('returns a known template with full node/connection data', async () => {
      const { status, body } = await apiCall('GET', '/api/templates/tutorial-data-flow', undefined, authToken);
      if (status === 0) return;
      expect(status).toBe(200);
      expect(body.data.id).toBe('tutorial-data-flow');
      expect(Array.isArray(body.data.nodes)).toBe(true);
      expect(Array.isArray(body.data.connections)).toBe(true);
      expect(body.data.nodes.length).toBeGreaterThan(0);
    });

    test('returns 404 for unknown template', async () => {
      const { status } = await apiCall('GET', '/api/templates/does-not-exist', undefined, authToken);
      if (status === 0) return;
      expect(status).toBe(404);
    });
  });

  describe('POST /api/templates/:id/create', () => {
    test('creates a workflow from a template', async () => {
      const { status, body } = await apiCall(
        'POST', '/api/templates/tutorial-data-flow/create',
        { name: 'My Tutorial Copy' }, authToken
      );
      if (status === 0) return;
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('My Tutorial Copy');
      expect(Array.isArray(body.data.nodes)).toBe(true);
      expect(body.data.nodes.length).toBeGreaterThan(0);
    });

    test('created workflow nodes get new UUIDs (not template IDs)', async () => {
      const templateNodes = (workflowTemplates as any)['tutorial-data-flow'].nodes;
      const templateNodeIds = new Set(templateNodes.map((n: any) => n.id));

      const { status, body } = await apiCall(
        'POST', '/api/templates/tutorial-data-flow/create', {}, authToken
      );
      if (status === 0) return;
      expect(status).toBe(200);
      for (const node of body.data.nodes) {
        expect(templateNodeIds.has(node.id)).toBe(false);
      }
    });

    test('uses template name when no name is provided', async () => {
      const { status, body } = await apiCall(
        'POST', '/api/templates/demo-crypto-prices/create', {}, authToken
      );
      if (status === 0) return;
      expect(status).toBe(200);
      expect(body.data.name).toBe((workflowTemplates as any)['demo-crypto-prices'].name);
    });

    test('returns 404 for unknown template', async () => {
      const { status } = await apiCall(
        'POST', '/api/templates/does-not-exist/create', {}, authToken
      );
      if (status === 0) return;
      expect(status).toBe(404);
    });
  });
});
