import { workflowTemplates } from '../../data/templates';

describe('workflowTemplates data', () => {
  const entries = Object.entries(workflowTemplates);

  test('exports a non-empty object', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  test('every template has required fields', () => {
    for (const [id, tpl] of entries) {
      const t = tpl as any;
      expect(typeof id).toBe('string');
      expect(typeof t.name).toBe('string');
      expect(typeof t.description).toBe('string');
      expect(typeof t.category).toBe('string');
      expect(Array.isArray(t.tags)).toBe(true);
      expect(Array.isArray(t.nodes)).toBe(true);
      expect(Array.isArray(t.connections)).toBe(true);
    }
  });

  test('every node has id, type, name, and position', () => {
    for (const [id, tpl] of entries) {
      const t = tpl as any;
      for (const node of t.nodes) {
        expect(node.id).toBeDefined();
        expect(node.type).toBeDefined();
        expect(node.name).toBeDefined();
        expect(node.position).toBeDefined();
      }
    }
  });

  test('every connection references existing node ids', () => {
    for (const [id, tpl] of entries) {
      const t = tpl as any;
      const nodeIds = new Set(t.nodes.map((n: any) => n.id));
      for (const conn of t.connections) {
        expect(nodeIds.has(conn.source)).toBe(true);
        expect(nodeIds.has(conn.target)).toBe(true);
      }
    }
  });

  test('known templates are present', () => {
    expect(workflowTemplates).toHaveProperty('tutorial-data-flow');
    expect(workflowTemplates).toHaveProperty('data-csv-processor');
    expect(workflowTemplates).toHaveProperty('integration-webhook-api');
  });

  test('categories are non-empty strings', () => {
    const categories = [...new Set(Object.values(workflowTemplates).map((t: any) => t.category))];
    expect(categories.length).toBeGreaterThan(0);
    for (const cat of categories) {
      expect(typeof cat).toBe('string');
      expect((cat as string).length).toBeGreaterThan(0);
    }
  });
});
