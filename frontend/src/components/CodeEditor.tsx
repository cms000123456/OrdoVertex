import React, { useState, useEffect, useRef, useCallback } from 'react';
import './CodeEditor.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'javascript' | 'python' | 'json' | 'plaintext';
  placeholder?: string;
  rows?: number;
  readOnly?: boolean;
}

// Simple syntax highlighting patterns - using string patterns to avoid regex escaping issues
const syntaxPatterns: Record<string, Array<{ pattern: string; flags: string; color: string }>> = {
  javascript: [
    { pattern: '\\\\b(const|let|var|function|return|if|else|for|while|switch|case|break|try|catch|throw|new|this|class|extends|import|export|from|async|await)\\\\b', flags: 'g', color: '#c678dd' },
    { pattern: '\\\\b(console|Math|Date|JSON|Object|Array|String|Number|Boolean|Promise|Set|Map|RegExp|Error)\\\\b', flags: 'g', color: '#e5c07b' },
    { pattern: '"[^"]*"', flags: 'g', color: '#98c379' },
    { pattern: "'[^']*'", flags: 'g', color: '#98c379' },
    { pattern: '`[^`]*`', flags: 'g', color: '#98c379' },
    { pattern: '\\\\b\\d+\\\\b', flags: 'g', color: '#d19a66' },
    { pattern: '\\\\b(true|false|null|undefined)\\\\b', flags: 'g', color: '#d19a66' },
    { pattern: '\\\\b([a-zA-Z_$][a-zA-Z0-9_$]*)\\\\s*(?=\\()', flags: 'g', color: '#61afef' },
    { pattern: '//.*$', flags: 'gm', color: '#5c6370' },
    { pattern: '/\\*[\\s\\S]*?\\*/', flags: 'g', color: '#5c6370' },
  ],
  python: [
    { pattern: '\\\\b(def|class|if|elif|else|for|while|try|except|finally|with|import|from|as|return|yield|pass|break|continue|raise|assert|lambda|global|nonlocal|del)\\\\b', flags: 'g', color: '#c678dd' },
    { pattern: '\\\\b(True|False|None|and|or|not|in|is)\\\\b', flags: 'g', color: '#c678dd' },
    { pattern: '\\\\b(print|len|range|enumerate|zip|map|filter|sum|min|max|abs|round|int|float|str|list|dict|tuple|set|open|type|isinstance|hasattr|getattr)\\\\b', flags: 'g', color: '#61afef' },
    { pattern: '"[^"]*"', flags: 'g', color: '#98c379' },
    { pattern: "'[^']*'", flags: 'g', color: '#98c379' },
    { pattern: '\\\\b\\d+\\\\b', flags: 'g', color: '#d19a66' },
    { pattern: '#.*', flags: 'g', color: '#5c6370' },
    { pattern: '\\\\b([a-zA-Z_][a-zA-Z0-9_]*)\\\\s*(?=\\()', flags: 'g', color: '#61afef' },
  ],
  json: [
    { pattern: '"[^"]*":', flags: 'g', color: '#e06c75' },
    { pattern: '"[^"]*"', flags: 'g', color: '#98c379' },
    { pattern: '\\\\b(true|false|null)\\\\b', flags: 'g', color: '#d19a66' },
    { pattern: '\\\\b\\d+(\\.\\d+)?\\\\b', flags: 'g', color: '#d19a66' },
  ],
  plaintext: [],
};

// Apply syntax highlighting
const highlightCode = (code: string, language: string): string => {
  const patterns = syntaxPatterns[language] || [];
  if (patterns.length === 0) {
    return escapeHtml(code);
  }

  // Store replacements to avoid overlapping matches
  const replacements: Array<{ start: number; end: number; html: string }> = [];
  
  patterns.forEach(({ pattern, flags, color }) => {
    try {
      const regex = new RegExp(pattern, flags);
      let match;
      while ((match = regex.exec(code)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        // Prevent infinite loops on zero-width matches
        if (match[0].length === 0) {
          regex.lastIndex++;
          continue;
        }
        const escaped = escapeHtml(match[0]);
        replacements.push({ start, end, html: `<span style="color: ${color}">${escaped}</span>` });
      }
    } catch (e) {
      console.error('Regex error:', e);
    }
  });
  
  if (replacements.length === 0) return escapeHtml(code);
  
  // Sort by position and filter out overlapping matches
  const sortedReplacements = replacements.sort((a, b) => a.start - b.start);
  const filteredReplacements: typeof replacements = [];
  
  for (const rep of sortedReplacements) {
    const last = filteredReplacements[filteredReplacements.length - 1];
    if (!last || rep.start >= last.end) {
      filteredReplacements.push(rep);
    }
  }
  
  // Rebuild string
  let result = '';
  let lastIndex = 0;
  
  for (const rep of filteredReplacements) {
    result += escapeHtml(code.slice(lastIndex, rep.start));
    result += rep.html;
    lastIndex = rep.end;
  }
  result += escapeHtml(code.slice(lastIndex));
  
  return result;
};

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'plaintext',
  placeholder,
  rows = 10,
  readOnly = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const [lineCount, setLineCount] = useState(1);
  const [isFocused, setIsFocused] = useState(false);

  // Calculate line count
  useEffect(() => {
    setLineCount(value.split('\n').length || 1);
  }, [value]);

  // Sync scroll between textarea and highlight
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Handle tab key for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
      // Restore cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Generate line numbers
  const lineNumbers = Array.from({ length: Math.max(lineCount, rows) }, (_, i) => i + 1);

  // Get display language name
  const languageLabel = {
    javascript: 'JavaScript',
    python: 'Python',
    json: 'JSON',
    plaintext: 'Plain Text',
  }[language];

  const highlightedCode = highlightCode(value, language);

  return (
    <div className={`code-editor ${isFocused ? 'focused' : ''} ${readOnly ? 'readonly' : ''}`}>
      {/* Header with language label */}
      <div className="code-editor-header">
        <span className="code-editor-language">{languageLabel}</span>
        {readOnly && <span className="code-editor-readonly-badge">Read Only</span>}
      </div>

      <div className="code-editor-container">
        {/* Line numbers */}
        <div className="code-editor-line-numbers">
          {lineNumbers.map((num) => (
            <div key={num} className="line-number">
              {num}
            </div>
          ))}
        </div>

        {/* Editor area */}
        <div className="code-editor-wrapper">
          {/* Syntax highlighted background */}
          <pre
            ref={highlightRef}
            className="code-editor-highlight"
            aria-hidden="true"
          >
            <code 
              dangerouslySetInnerHTML={{ 
                __html: highlightedCode + '\n' 
              }} 
            />
          </pre>

          {/* Textarea for input */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            readOnly={readOnly}
            className="code-editor-textarea"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
