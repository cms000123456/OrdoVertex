import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { NodeType } from '../types';

interface NodePanelProps {
  nodeTypes: NodeType[];
}

export function NodePanel({ nodeTypes }: NodePanelProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Triggers', 'Actions', 'Core'])
  );

  // Group nodes by category
  const groupedNodes = nodeTypes.reduce((acc, node) => {
    if (!acc[node.category]) {
      acc[node.category] = [];
    }
    acc[node.category].push(node);
    return acc;
  }, {} as Record<string, NodeType[]>);

  // Filter nodes by search
  const filteredGroups = Object.entries(groupedNodes).reduce(
    (acc, [category, nodes]) => {
      const filtered = nodes.filter(
        (n) =>
          n.displayName.toLowerCase().includes(search.toLowerCase()) ||
          n.description.toLowerCase().includes(search.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    },
    {} as Record<string, NodeType[]>
  );

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    console.log('Drag start:', nodeType);
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
    console.log('Data set:', event.dataTransfer.getData('application/reactflow'));
  };

  return (
    <div className="node-panel">
      <div className="panel-header">
        <h3>Nodes</h3>
      </div>

      <div className="search-container">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search nodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="node-categories">
        {Object.entries(filteredGroups).map(([category, nodes]) => (
          <div key={category} className="category">
            <button
              className="category-header"
              onClick={() => toggleCategory(category)}
            >
              {expandedCategories.has(category) ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
              <span>{category}</span>
              <span className="node-count">({nodes.length})</span>
            </button>

            {expandedCategories.has(category) && (
              <div className="node-list">
                {nodes.map((node) => (
                  <div
                    key={node.name}
                    className="node-item"
                    draggable
                    onDragStart={(e) => onDragStart(e, node.name)}
                  >
                    <div className="node-item-icon">
                      {node.name === 'stickyNote' ? '📝' :
                       node.icon?.includes('trigger') ? '⚡' : 
                       node.category === 'Triggers' ? '▶️' : '⚙️'}
                    </div>
                    <div className="node-item-info">
                      <div className="node-item-name">{node.displayName}</div>
                      <div className="node-item-description">
                        {node.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
