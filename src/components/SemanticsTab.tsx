import React from 'react';
import { CompilerError } from '../compiler/lexer.js';

interface SymbolEntry {
  name: string;
  kind: string;
  dataType: string;
  isConst: boolean;
  used: boolean;
  line: number;
  column: number;
}

interface ScopeSerialized {
  name: string;
  symbols: SymbolEntry[];
  children: ScopeSerialized[];
}

interface SemanticsTabProps {
  symbolTableData: ScopeSerialized | null;
  errors: CompilerError[];
}

const ScopeView: React.FC<{ scope: ScopeSerialized }> = ({ scope }) => {
  return (
    <div style={{ marginBottom: '20px', borderLeft: '2px solid rgba(139, 92, 246, 0.3)', paddingLeft: '12px' }}>
      <h4 style={{ color: '#a78bfa', fontSize: '14px', marginBottom: '8px', fontFamily: 'monospace' }}>
        Scope: {scope.name}
      </h4>
      {scope.symbols.length === 0 ? (
        <div style={{ color: '#9ca3af', fontSize: '12px', fontStyle: 'italic', marginBottom: '8px' }}>
          (no local variables declared)
        </div>
      ) : (
        <table className="data-table" style={{ fontSize: '12px', marginBottom: '8px' }}>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Kind</th>
              <th>Type</th>
              <th>Const?</th>
              <th>Used?</th>
              <th>Decl Line</th>
            </tr>
          </thead>
          <tbody>
            {scope.symbols.map((sym, idx) => (
              <tr key={idx}>
                <td style={{ fontFamily: 'monospace', color: '#f3f4f6', fontWeight: 'bold' }}>{sym.name}</td>
                <td>
                  <span style={{ 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontSize: '10px',
                    background: sym.kind === 'function' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.05)',
                    color: sym.kind === 'function' ? '#22d3ee' : '#9ca3af'
                  }}>
                    {sym.kind}
                  </span>
                </td>
                <td style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{sym.dataType}</td>
                <td>{sym.isConst ? 'Yes' : 'No'}</td>
                <td>
                  <span style={{ color: sym.used ? '#10b981' : '#f59e0b' }}>
                    {sym.used ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>{sym.line}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {scope.children.map((child, idx) => (
        <ScopeView key={idx} scope={child} />
      ))}
    </div>
  );
};

const SemanticsTab: React.FC<SemanticsTabProps> = ({ symbolTableData, errors }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
      {/* Symbol Table Scope Tree */}
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '12px', color: '#f3f4f6' }}>
          Resolved Scopes & Symbol Tables
        </h3>
        {symbolTableData ? (
          <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <ScopeView scope={symbolTableData} />
          </div>
        ) : (
          <div style={{ color: '#9ca3af' }}>No symbol table generated.</div>
        )}
      </div>

      {/* Warnings & Errors */}
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '12px', color: '#f3f4f6' }}>
          Diagnostics & Messages
        </h3>
        {errors.length === 0 ? (
          <div style={{ 
            color: '#10b981', 
            background: 'rgba(16, 185, 129, 0.05)', 
            border: '1px solid rgba(16, 185, 129, 0.15)',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '13px'
          }}>
            ✔ Analysis clean. No warnings or errors found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {errors.map((err, idx) => {
              const isWarning = err.message.startsWith('Warning:');
              return (
                <div key={idx} className={`message-item ${isWarning ? 'message-warning' : 'message-error'}`}>
                  {isWarning ? (
                    <span className="warning-badge">WARNING</span>
                  ) : (
                    <span className="error-badge">{err.type} ERROR</span>
                  )}
                  <div>
                    <div style={{ color: '#e5e7eb', fontWeight: '600' }}>{err.message}</div>
                    <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '2px' }}>
                      Line {err.line}, Column {err.column}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SemanticsTab;
