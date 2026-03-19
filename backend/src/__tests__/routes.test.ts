import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Import routes
import authRoutes from '../routes/auth';
import workflowRoutes from '../routes/workflows';
import templateRoutes from '../routes/templates';
import nodeRoutes from '../routes/nodes';
import executionRoutes from '../routes/executions';
import credentialRoutes from '../routes/credentials';
import apiKeyRoutes from '../routes/api-keys';

const prisma = new PrismaClient();

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mount routes
  app.use('/api/auth', authRoutes);
  app.use('/api/workflows', workflowRoutes);
  app.use('/api/templates', templateRoutes);
  app.use('/api/nodes', nodeRoutes);
  app.use('/api/executions', executionRoutes);
  app.use('/api/credentials', credentialRoutes);
  app.use('/api/api-keys', apiKeyRoutes);
  
  return app;
};

describe('API Routes Coverage', () => {
  let app: express.Application;
  let testUser: any;
  let authToken: string;
  
  beforeAll(async () => {
    app = createTestApp();
    
    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'user'
      }
    });
    
    // Generate auth token
    authToken = jwt.sign(
      { id: testUser.id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  });
  
  afterAll(async () => {
    // Cleanup
    await prisma.workflowExecution.deleteMany({});
    await prisma.workflow.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('Auth Routes', () => {
    test('POST /api/auth/register - should register new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('newuser@example.com');
    });

    test('POST /api/auth/login - should login user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword123'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    test('GET /api/auth/me - should get current user', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Workflow Routes', () => {
    let testWorkflow: any;
    
    beforeEach(async () => {
      testWorkflow = await prisma.workflow.create({
        data: {
          name: 'Test Workflow',
          description: 'Test description',
          nodes: [],
          connections: [],
          userId: testUser.id
        }
      });
    });

    test('GET /api/workflows - should list workflows', async () => {
      const res = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('POST /api/workflows - should create workflow', async () => {
      const res = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New Workflow',
          nodes: [],
          connections: []
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/workflows/:id - should get workflow', async () => {
      const res = await request(app)
        .get(`/api/workflows/${testWorkflow.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('PATCH /api/workflows/:id - should update workflow', async () => {
      const res = await request(app)
        .patch(`/api/workflows/${testWorkflow.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('DELETE /api/workflows/:id - should delete workflow', async () => {
      const res = await request(app)
        .delete(`/api/workflows/${testWorkflow.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('POST /api/workflows/:id/execute - should execute workflow', async () => {
      const res = await request(app)
        .post(`/api/workflows/${testWorkflow.id}/execute`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/workflows/:id/export - should export workflow', async () => {
      const res = await request(app)
        .get(`/api/workflows/${testWorkflow.id}/export`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
    });

    test('POST /api/workflows/import - should import workflow', async () => {
      const res = await request(app)
        .post('/api/workflows/import')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflow: {
            name: 'Imported',
            nodes: [],
            connections: []
          }
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Template Routes', () => {
    test('GET /api/templates - should list templates', async () => {
      const res = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/templates/categories/list - should list categories', async () => {
      const res = await request(app)
        .get('/api/templates/categories/list')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('POST /api/templates/:id/create - should create from template', async () => {
      const res = await request(app)
        .post('/api/templates/data-csv-processor/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'My CSV Workflow' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Node Routes', () => {
    test('GET /api/nodes - should list nodes', async () => {
      const res = await request(app)
        .get('/api/nodes')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/nodes/categories - should list node categories', async () => {
      const res = await request(app)
        .get('/api/nodes/categories')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Execution Routes', () => {
    test('GET /api/executions - should list executions', async () => {
      const res = await request(app)
        .get('/api/executions')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Credential Routes', () => {
    test('GET /api/credentials - should list credentials', async () => {
      const res = await request(app)
        .get('/api/credentials')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/credentials/types/list - should list credential types', async () => {
      const res = await request(app)
        .get('/api/credentials/types/list')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('API Key Routes', () => {
    test('GET /api/api-keys - should list API keys', async () => {
      const res = await request(app)
        .get('/api/api-keys')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
