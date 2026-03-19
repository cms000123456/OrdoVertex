import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Play, 
  Clock, 
  Globe, 
  Code, 
  Settings,
  GitBranch,
  PenTool,
  Send,
  Activity,
  Filter,
  ArrowDownNarrowWide,
  CopyX,
  CalendarDays,
  Type,
  Calculator,
  Tag,
  Mail,
  FileSpreadsheet,
  Reply,
  Server,
  FolderOpen,
  Cloud,
  Contact
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  'manualTrigger': <Play size={16} />,
  'scheduleTrigger': <Clock size={16} />,
  'webhook': <Globe size={16} />,
  'code': <Code size={16} />,
  'set': <Settings size={16} />,
  'if': <GitBranch size={16} />,
  'httpRequest': <Send size={16} />,
  'wait': <Clock size={16} />,
  'split': <Settings size={16} />,
  'aggregate': <Activity size={16} />,
  'filter': <Filter size={16} />,
  'sort': <ArrowDownNarrowWide size={16} />,
  'removeDuplicates': <CopyX size={16} />,
  'dateTime': <CalendarDays size={16} />,
  'stringOps': <Type size={16} />,
  'math': <Calculator size={16} />,
  'renameFields': <Tag size={16} />,
  'sendEmail': <Mail size={16} />,
  'csv': <FileSpreadsheet size={16} />,
  'webhookResponse': <Reply size={16} />,
  'sftp': <Server size={16} />,
  'fileWatch': <FolderOpen size={16} />,
  's3Trigger': <Cloud size={16} />,
  'sftpTrigger': <Server size={16} />,
  'ldap': <Contact size={16} />,
  'default': <Activity size={16} />
};

const categoryColors: Record<string, string> = {
  'Triggers': '#10b981', // green
  'Actions': '#6366f1', // indigo
  'Transform': '#f59e0b', // amber
  'Logic': '#ec4899', // pink
  'Flow': '#8b5cf6', // violet
  'default': '#64748b' // slate
};

export function WorkflowNode({ data, selected }: NodeProps) {
  const icon = iconMap[data.type] || iconMap['default'];
  const color = categoryColors[data.category] || categoryColors['default'];

  return (
    <div className={`workflow-node ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="node-handle"
      />
      
      <div className="node-content" style={{ borderLeftColor: color }}>
        <div className="node-icon" style={{ backgroundColor: `${color}20`, color }}>
          {icon}
        </div>
        <div className="node-info">
          <div className="node-label">{data.label}</div>
          <div className="node-type">{data.type}</div>
          {data.description && (
            <div className="node-description" title={data.description}>
              {data.description}
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="node-handle"
      />
    </div>
  );
}
