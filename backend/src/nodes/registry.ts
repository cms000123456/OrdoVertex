import { NodeType } from '../types';
import logger from '../utils/logger';

class NodeRegistry {
  private nodes: Map<string, NodeType> = new Map();

  register(nodeType: NodeType): void {
    this.nodes.set(nodeType.name, nodeType);
    logger.info(`✓ Registered node: ${nodeType.displayName} (${nodeType.name})`);
  }

  get(name: string): NodeType | undefined {
    return this.nodes.get(name);
  }

  getAll(): NodeType[] {
    return Array.from(this.nodes.values());
  }

  getByCategory(category: string): NodeType[] {
    return this.getAll().filter(node => node.category === category);
  }

  getCategories(): string[] {
    const categories = new Set(this.getAll().map(node => node.category));
    return Array.from(categories);
  }

  unregister(name: string): boolean {
    return this.nodes.delete(name);
  }
}

export const nodeRegistry = new NodeRegistry();
