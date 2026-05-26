import React from 'react';
import { Token } from '../compiler/lexer.js';

interface LexerTabProps {
  tokens: Token[];
}

const LexerTab: React.FC<LexerTabProps> = ({ tokens }) => {
  if (tokens.length === 0) {
    return <div style={{ color: '#9ca3af' }}>No tokens generated. Enter source code to scan.</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '12px', fontSize: '13px', color: '#9ca3af' }}>
        Identified <strong>{tokens.length}</strong> tokens (including End-of-File marker).
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Index</th>
            <th>Type</th>
            <th>Lexeme / Value</th>
            <th>Line</th>
            <th>Column</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token, index) => (
            <tr key={index} style={token.type === 'EOF' ? { opacity: 0.5 } : {}}>
              <td>{index}</td>
              <td style={{ fontFamily: 'monospace', color: '#a78bfa', fontWeight: 'bold' }}>{token.type}</td>
              <td style={{ fontFamily: 'monospace', color: '#e5e7eb' }}>
                {token.type === 'EOF' ? <em>EOF</em> : JSON.stringify(token.value)}
              </td>
              <td>{token.line}</td>
              <td>{token.column}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LexerTab;
