import React, { useState } from 'react';
import { Lightbulb, X, ChevronDown, ChevronUp, Bot, Key, Wrench, Brain, BookOpen } from 'lucide-react';
import './AITips.css';

interface AITipsProps {
  context?: 'agent' | 'embedding' | 'vector-store' | 'text-splitter';
}

const tipsByContext: Record<string, { title: string; icon: React.ReactNode; tips: { title: string; content: string }[] }> = {
  'agent': {
    title: 'AI Agent Tips',
    icon: <Bot size={18} />,
    tips: [
      {
        title: 'Memory Keys',
        content: 'Use user-{{ $input.userId }} for user-specific conversations, or {{ $executionId }} for per-execution context.'
      },
      {
        title: 'Temperature Setting',
        content: '0.1 = factual/consistent, 0.7 = balanced, 1.0+ = creative/experimental'
      },
      {
        title: 'Cost Optimization',
        content: 'Start with GPT-4o Mini or Gemini Flash for prototyping, upgrade for production.'
      },
      {
        title: 'System Prompt Tips',
        content: 'Be specific about the AI\'s role. Example: "You are a helpful customer support agent for Acme Corp."'
      },
      {
        title: 'Tool Usage',
        content: 'Enable tools like "calculate" and "get_current_time" to let the AI perform actions.'
      }
    ]
  },
  'embedding': {
    title: 'AI Embedding Tips',
    icon: <Brain size={18} />,
    tips: [
      {
        title: 'Model Selection',
        content: 'text-embedding-3-small: Fast & cheap. text-embedding-3-large: Best quality for complex tasks.'
      },
      {
        title: 'Input Length',
        content: 'Long text is automatically truncated. Use Text Splitter first for documents >8000 tokens.'
      },
      {
        title: 'Rate Limits',
        content: 'OpenAI has rate limits. For bulk processing, use Split In Batches node with delays.'
      }
    ]
  },
  'vector-store': {
    title: 'Vector Store Tips',
    icon: <Brain size={18} />,
    tips: [
      {
        title: 'Store Names',
        content: 'Use descriptive names like "knowledge-base-hr" or "docs-v1". Stores are per-workflow.'
      },
      {
        title: 'Top K Results',
        content: 'Start with topK=5. Increase for broader context, decrease for focused answers.'
      },
      {
        title: 'Metadata',
        content: 'Include metadata (source, date, author) when upserting for better context in responses.'
      }
    ]
  },
  'text-splitter': {
    title: 'Text Splitter Tips',
    icon: <Brain size={18} />,
    tips: [
      {
        title: 'Chunk Size',
        content: '1000-2000 characters with 200 overlap works well for most documents.'
      },
      {
        title: 'Splitter Type',
        content: 'Recursive: General docs. Markdown: Documentation. Token: LLM-aware splitting.'
      },
      {
        title: 'Overlap',
        content: '20% overlap helps maintain context between chunks. Critical for RAG pipelines.'
      }
    ]
  }
};

export function AITips({ context = 'agent' }: AITipsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedTips, setDismissedTips] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const tipData = tipsByContext[context] || tipsByContext['agent'];
  const visibleTips = showAll ? tipData.tips : tipData.tips.slice(0, 3);
  const hasMore = tipData.tips.length > 3;

  const dismissTip = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedTips(prev => new Set([...prev, index]));
  };

  const filteredTips = visibleTips.filter((_, idx) => !dismissedTips.has(idx));

  if (filteredTips.length === 0) {
    return null;
  }

  return (
    <div className="ai-tips-panel">
      <div className="ai-tips-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="ai-tips-title">
          <Lightbulb size={16} className="tip-icon" />
          <span>{tipData.title}</span>
        </div>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      
      {isExpanded && (
        <div className="ai-tips-content">
          {filteredTips.map((tip, idx) => (
            <div key={idx} className="ai-tip-item">
              <button 
                className="ai-tip-dismiss"
                onClick={(e) => dismissTip(idx, e)}
                title="Dismiss tip"
              >
                <X size={12} />
              </button>
              <h4>{tip.title}</h4>
              <p>{tip.content}</p>
            </div>
          ))}
          
          {hasMore && !showAll && (
            <button className="ai-tips-show-more" onClick={() => setShowAll(true)}>
              Show more tips
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Quick help button for toolbar
export function AIHelpButton() {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="ai-help-button-container">
      <button 
        className="ai-help-button"
        onClick={() => setShowMenu(!showMenu)}
        title="AI Workflow Help"
      >
        <Brain size={18} />
        <span>AI Help</span>
      </button>
      
      {showMenu && (
        <div className="ai-help-menu">
          <a href="/help?section=ai-workflows" className="ai-help-menu-item">
            <BookOpen size={16} />
            <span>AI Workflow Guide</span>
          </a>
          <a href="/help?section=ai-providers" className="ai-help-menu-item">
            <Key size={16} />
            <span>Provider Setup</span>
          </a>
          <a href="/help?section=ai-examples" className="ai-help-menu-item">
            <Wrench size={16} />
            <span>Example Workflows</span>
          </a>
        </div>
      )}
    </div>
  );
}

export default AITips;
