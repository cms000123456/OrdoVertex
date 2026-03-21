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
  'Triggers': '#10b981',
  'Actions': '#6366f1',
  'Transform': '#f59e0b',
  'Logic': '#ec4899',
  'Flow': '#8b5cf6',
  'default': '#64748b'
};

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
interface StickyNoteProps {
  data: any;
  selected?: boolean;
  id: string;
}

function StickyNoteNode({ data, selected, id }: StickyNoteProps) {
  const colorKey = data.parameters?.color || 'yellow';
  const colors = stickyNoteColors[colorKey] || stickyNoteColors['yellow'];
  const text = data.parameters?.text || data.description || 'Note';
  const initialWidth = data.parameters?.width || 200;
  const initialHeight = data.parameters?.height || 150;
  
  const [dimensions, setDimensions] = useState({ width: initialWidth, height: initialHeight });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const updateNodeParameters = useWorkflowStore((state) => state.updateNodeParameters);
  const nodeRef = useRef<HTMLDivElement>(null);

  // Update dimensions when props change
  useEffect(() => {
    setDimensions({ width: initialWidth, height: initialHeight });
  }, [initialWidth, initialHeight]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: dimensions.width,
      height: dimensions.height
    };
  }, [dimensions]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStart.current.x;
    const deltaY = e.clientY - resizeStart.current.y;
    
    const newWidth = Math.max(100, resizeStart.current.width + deltaX);
    const newHeight = Math.max(80, resizeStart.current.height + deltaY);
    
    setDimensions({ width: newWidth, height: newHeight });
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      // Save to store
      if (id) {
        updateNodeParameters(id, {
          width: dimensions.width,
          height: dimensions.height
        });
      }
    }
  }, [isResizing, dimensions, id, updateNodeParameters]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  return (
    <div 
      ref={nodeRef}
      className={`sticky-note ${selected ? 'selected' : ''}`}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        padding: '12px 12px 24px 12px',
        borderRadius: '4px',
        border: selected ? `2px solid ${colors.border}` : `1px solid ${colors.border}`,
        overflow: 'hidden',
        boxShadow: selected 
          ? `0 4px 16px rgba(0,0,0,0.2)` 
          : '0 2px 8px rgba(0,0,0,0.1)',
        fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif',
        fontSize: '14px',
        lineHeight: '1.5',
        wordWrap: 'break-word',
        whiteSpace: 'pre-wrap',
        cursor: isResizing ? 'se-resize' : 'default',
        position: 'relative',
        userSelect: 'none'
      }}
    >
      {/* Fold in corner */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 0,
        height: 0,
        borderStyle: 'solid',
        borderWidth: '0 20px 20px 0',
        borderColor: `transparent ${colors.border} transparent transparent`,
        opacity: 0.3
      }} />
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 0,
        height: 0,
        borderStyle: 'solid',
        borderWidth: '0 18px 18px 0',
        borderColor: `transparent ${colors.bg} transparent transparent`
      }} />
      
      {/* Pin icon */}
      <div style={{
        position: 'absolute',
        top: '-8px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '14px',
        height: '14px',
        backgroundColor: '#ef4444',
        borderRadius: '50%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        zIndex: 10
      }} />
      
      {/* Note content */}
      <div style={{ 
        marginTop: '4px', 
        height: 'calc(100% - 20px)',
        overflow: 'auto'
      }}>
        {text}
      </div>

      {/* Resize handle */}
      {selected && (
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            width: '20px',
            height: '20px',
            cursor: 'nwse-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.border,
            borderRadius: '3px 0 0 0',
            opacity: 0.7,
            zIndex: 20
          }}
          title="Drag to resize"
        >
          <GripVertical size={14} style={{ 
            transform: 'rotate(45deg)', 
            color: colors.text,
            opacity: 0.8
          }} />
        </div>
      )}
    </div>
  );
}

export function WorkflowNode({ data, selected, id }: NodeProps) {
  if (data.type === 'stickyNote') {
    return <StickyNoteNode data={data} selected={selected} id={id} />;
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
