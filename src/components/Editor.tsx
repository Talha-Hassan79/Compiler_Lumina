import React, { useRef, useEffect } from 'react';
import { CompilerError } from '../compiler/lexer.js';

interface EditorProps {
  value: string;
  onChange: (val: string) => void;
  errors: CompilerError[];
}

const Editor: React.FC<EditorProps> = ({ value, onChange, errors }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Sync scroll between textarea and line numbers column
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const lineCount = value.split('\n').length;
  const lines = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);

  // Get lines that have errors/warnings
  const errorLines = new Map<number, 'error' | 'warning'>();
  for (const err of errors) {
    const isWarning = err.message.startsWith('Warning:');
    const existing = errorLines.get(err.line);
    if (existing !== 'error') {
      errorLines.set(err.line, isWarning ? 'warning' : 'error');
    }
  }

  useEffect(() => {
    handleScroll();
  }, [value]);

  return (
    <div className="editor-container">
      {/* Line Numbers Column */}
      <div 
        ref={lineNumbersRef}
        className="line-numbers"
        style={{ overflow: 'hidden', height: '100%' }}
      >
        {lines.map(line => {
          const status = errorLines.get(line);
          let style: React.CSSProperties = {};
          let title = '';

          if (status === 'error') {
            style = { color: '#f43f5e', background: 'rgba(244, 63, 94, 0.15)', fontWeight: 'bold' };
            title = 'Compilation error on this line';
          } else if (status === 'warning') {
            style = { color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', fontWeight: 'bold' };
            title = 'Compilation warning on this line';
          }

          return (
            <div 
              key={line} 
              style={{ ...style, height: '20.8px', paddingRight: '8px' }}
              title={title}
            >
              {line}
            </div>
          );
        })}
      </div>

      {/* Editor Textarea */}
      <textarea
        ref={textareaRef}
        className="code-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        spellCheck={false}
        placeholder="// Write your Lumina code here..."
      />
    </div>
  );
};

export default Editor;
