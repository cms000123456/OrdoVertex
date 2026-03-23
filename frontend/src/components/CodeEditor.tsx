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

// Simple syntax highlighting patterns
const syntaxPatterns: Record<string, Array<{ pattern: RegExp; color: string }>> = {
  javascript: [
    { pattern: /\\b(const|let|var|function|return|if|else|for|while|switch|case|break|try|catch|throw|new|this|class|extends|import|export|from|async|await)\\b/g, color: '#c678dd' }, // Keywords
    { pattern: /\\b(console|Math|Date|JSON|Object|Array|String|Number|Boolean|Promise|Set|Map|RegExp|Error)\\b/g, color: '#e5c07b' }, // Built-ins
    { pattern: /"[^"]*"|'[^']*'|`[^`]*`/g, color: '#98c379' }, // Strings
    { pattern: /\\b\\d+\\b/g, color: '#d19a66' }, // Numbers
    { pattern: /\\b(true|false|null|undefined)\\b/g, color: '#d19a66' }, // Booleans/Null
    { pattern: /\\b([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*(?=\\()/g, color: '#61afef' }, // Functions
    { pattern: /\\/\\/.*$/gm, color: '#5c6370' }, // Comments
    { pattern: /\\/\\*[\\s\\S]*?\\*\\//g, color: '#5c6370' }, // Block comments
  ],
  python: [
    { pattern: /\\b(def|class|if|elif|else|for|while|try|except|finally|with|import|from|as|return|yield|pass|break|continue|raise|assert|lambda|global|nonlocal|del)\\b/g, color: '#c678dd' }, // Keywords
    { pattern: /\\b(True|False|None|and|or|not|in|is)\\b/g, color: '#c678dd' }, // Booleans/Operators
    { pattern: /\\b(print|len|range|enumerate|zip|map|filter|sum|min|max|abs|round|int|float|str|list|dict|tuple|set|open|type|isinstance|hasattr|getattr)\\b/g, color: '#61afef' }, // Built-ins
    { pattern: /"[^"]*"|'[^']*'/g, color: '#98c379' }, // Strings
    { pattern: /\\b\\d+\\b/g, color: '#d19a66' }, // Numbers
    { pattern: /#.*/g, color: '#5c6370' }, // Comments
    { pattern: /\\b([a-zA-Z_][a-zA-Z0-9_]*)\\s*(?=\\()/g, color: '#61afef' }, // Functions
  ],
  json: [
    { pattern: /"[^"]*":/g, color: '#e06c75' }, // Keys
    { pattern: /"[^"]*"/g, color: '#98c379' }, // Strings
    { pattern: /\\b(true|false|null)\\b/g, color: '#d19a66' }, // Booleans/Null
    { pattern: /\\b\\d+(\\.\\d+)?\\b/g, color: '#d19a66' }, // Numbers
  ],
  plaintext: [],
};

// Apply syntax highlighting
const highlightCode = (code: string, language: string): string => {
  const patterns = syntaxPatterns[language] || [];
  if (patterns.length === 0) {
    return escapeHtml(code);
  }

  let highlighted = escapeHtml(code);
  
  // Store replacements to avoid overlapping matches
  const replacements: Array<{ start: number; end: number; html: string }> = [];
  
  patterns.forEach(({ pattern, color }) => {
    let match;
    const localPattern = new RegExp(pattern.source, pattern.flags);
    while ((match = localPattern.exec(code)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const escaped = escapeHtml(match[0]);
      replacements.push({ start, end, html: `<span style="color: ${color}">${escaped}</span>` });
    }
  });
  
  // Sort by position and apply (simplified - may have issues with overlapping)
  if (replacements.length === 0) return highlighted;
  
  // Simple approach: rebuild string character by character
  let result = '';
  let lastIndex = 0;
  
  // Group replacements by start position and pick the longest match
  const sortedReplacements = replacements.sort((a, b) => a.start - b.start);
  const filteredReplacements: typeof replacements = [];
  
  for (const rep of sortedReplacements) {
    const last = filteredReplacements[filteredReplacements.length - 1];
    if (!last || rep.start >= last.end) {
      filteredReplacements.push(rep);
    }
  }
  
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
                __html: highlightedCode + '<span class="caret"></span>' 
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
