import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Contact,
  StickyNote,
  GripVertical
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

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
  'stickyNote': <StickyNote size={16} />,
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

// Sticky note color mappings
const stickyNoteColors: Record<string, { bg: string; border: string; text: string }> = {
  'yellow': { bg: '#fef3c7', border: '#fbbf24', text: '#92400e' },
  'green': { bg: '#dcfce7', border: '#86efac', text: '#166534' },
  'blue': { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' },
  'red': { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
  'purple': { bg: '#f3e8ff', border: '#d8b4fe', text: '#6b21a8' },
  'orange': { bg: '#ffedd5', border: '#fdba74', text: '#9a3412' },
  'gray': { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' }
};

// Sticky Note Component with resize handle
interface StickyNoteData {
  id?: string;
  type: string;
  label?: string;
  description?: string;
  parameters?: {
    color?: string;
    text?: string;
    width?: number;
    height?: number;
  };
}

interface StickyNoteProps {
  data: StickyNoteData;
  selected?: boolean;
}

function StickyNoteNode({ data, selected }: StickyNoteProps) {
  const colorKey = data.parameters?.color || 'yellow';
  const colors = stickyNoteColors[colorKey] || stickyNoteColors['yellow'];
  const text = data.parameters?.text || data.description || 'Note';
  const [width, setWidth] = useState(data.parameters?.width || 200);
  const [height, setHeight] = useState(data.parameters?.height || 150);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const updateNodeParameters = useWorkflowStore((state) => state.updateNodeParameters);

  // Update local state when props change
  useEffect(() => {
    setWidth(data.parameters?.width || 200);
    setHeight(data.parameters?.height || 150);
  }, [data.parameters?.width, data.parameters?.height]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width,
      height
    };
  }, [width, height]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStart.current.x;
    const deltaY = e.clientY - resizeStart.current.y;
    
    const newWidth = Math.max(100, resizeStart.current.width + deltaX);
    const newHeight = Math.max(80, resizeStart.current.height + deltaY);
    
    setWidth(newWidth);
    setHeight(newHeight);
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    if (isResizing && data.id) {
      setIsResizing(false);
      // Update the store with new dimensions
      updateNodeParameters(data.id, {
        width,
        height
      });
    }
  }, [isResizing, width, height, data.id, updateNodeParameters]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  return (
    <div 
      className={`sticky-note ${selected ? 'selected' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
        width: `${width}px`,
        height: `${height}px`,
        padding: '12px',
        borderRadius: '4px',
        border: `1px solid ${colors.border}`,
        overflow: 'auto',
        boxShadow: selected 
          ? `0 0 0 2px ${colors.border}, 0 4px 12px rgba(0,0,0,0.15)` 
          : '0 2px 8px rgba(0,0,0,0.1)',
        fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif',
        fontSize: '14px',
        lineHeight: '1.5',
        wordWrap: 'break-word',
        whiteSpace: 'pre-wrap',
        cursor: isResizing ? 'se-resize' : 'grab',
        position: 'relative',
        userSelect: 'none'
      }}
    >
      {/* Small fold in corner */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 0,
          height: 0,
          borderStyle: 'solid',
          borderWidth: '0 20px 20px 0',
          borderColor: `transparent ${colors.border} transparent transparent`,
          opacity: 0.3
        }}
      />
      <div 
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 0,
          height: 0,
          borderStyle: 'solid',
          borderWidth: '0 18px 18px 0',
          borderColor: `transparent ${colors.bg} transparent transparent`
        }}
      />
      
      {/* Pin icon */}
      <div 
        style={{
          position: 'absolute',
          top: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '16px',
          height: '16px',
          backgroundColor: '#ef4444',
          borderRadius: '50%',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          zIndex: 10
        }}
      />
      
      {/* Note content */}
      <div style={{ marginTop: '4px' }}>
        {text}
      </div>
      
      {/* Node label at bottom */}
      {data.label && data.label !== '📝 Sticky Note' && (
        <div 
          style={{
            marginTop: '8px',
            fontSize: '11px',
            fontWeight: 'bold',
            opacity: 0.7,
            borderTop: `1px dashed ${colors.border}`,
            paddingTop: '4px'
          }}
        >
          {data.label}
        </div>
      )}

      {/* Resize handle - only visible when selected */}
      {selected && (
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            width: '16px',
            height: '16px',
            cursor: 'se-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '3px',
            backgroundColor: colors.border,
            opacity: 0.6,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
          title="Drag to resize"
        >
          <GripVertical size={12} style={{ transform: 'rotate(45deg)', color: colors.text }} />
        </div>
      )}
    </div>
  );
}

export function WorkflowNode({ data, selected, id }: NodeProps) {
  // Render sticky note specially
  if (data.type === 'stickyNote') {
    return <StickyNoteNode data={{ ...data, id }} selected={selected} />;
  }

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
