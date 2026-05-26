import React from 'react';
import { TACInstruction } from '../compiler/tac.js';
import { OptimizationLog } from '../compiler/optimizer.js';

interface IrTabProps {
  rawTac: TACInstruction[];
  optTac: TACInstruction[];
  optLogs: OptimizationLog[];
}

const renderTac = (tac: TACInstruction[]) => {
  if (tac.length === 0) {
    return <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>(empty code)</div>;
  }

  return (
    <pre style={{ 
      fontFamily: 'var(--font-mono)', 
      fontSize: '12px', 
      lineHeight: '1.6',
      color: '#e5e7eb',
      margin: 0
    }}>
      {tac.map((inst, idx) => {
        const opStr = inst.op.padEnd(14);
        const arg1Str = (inst.arg1 || '-').padEnd(10);
        const arg2Str = (inst.arg2 || '-').padEnd(10);
        const resStr = inst.result || '-';
        const lineStr = inst.line ? `  // line ${inst.line}` : '';
        const lineContent = `${idx.toString().padEnd(4)}: ${opStr} arg1: ${arg1Str} arg2: ${arg2Str} res: ${resStr}`;

        return (
          <div key={idx} style={{ 
            padding: '2px 6px',
            borderRadius: '4px',
            borderLeft: inst.op === 'LABEL' ? '2px solid rgba(6, 182, 212, 0.4)' : '2px solid transparent',
            background: inst.op === 'LABEL' ? 'rgba(6, 182, 212, 0.03)' : 'transparent',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>{lineContent}</span>
            <span style={{ color: '#6b7280', fontSize: '11px' }}>{lineStr}</span>
          </div>
        );
      })}
    </pre>
  );
};

const IrTab: React.FC<IrTabProps> = ({ rawTac, optTac, optLogs }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 0.8fr', gap: '16px', height: '100%', minHeight: '0' }}>
      {/* Raw TAC Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '0' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af' }}>
          Raw Three-Address Code
        </h3>
        <div style={{ 
          flex: 1, 
          background: 'rgba(0, 0, 0, 0.25)', 
          border: '1px solid rgba(255, 255, 255, 0.05)', 
          borderRadius: '8px', 
          padding: '12px',
          overflowY: 'auto',
          minHeight: '0'
        }}>
          {renderTac(rawTac)}
        </div>
      </div>

      {/* Optimized TAC Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '0' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#10b981' }}>
          Optimized Three-Address Code
        </h3>
        <div style={{ 
          flex: 1, 
          background: 'rgba(0, 0, 0, 0.25)', 
          border: '1px solid rgba(16, 185, 129, 0.15)', 
          borderRadius: '8px', 
          padding: '12px',
          overflowY: 'auto',
          minHeight: '0'
        }}>
          {renderTac(optTac)}
        </div>
      </div>

      {/* Optimization Logs Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '0' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#f59e0b' }}>
          Optimization Log
        </h3>
        <div style={{ 
          flex: 1, 
          background: 'rgba(0, 0, 0, 0.2)', 
          border: '1px solid rgba(255, 255, 255, 0.05)', 
          borderRadius: '8px', 
          padding: '12px',
          overflowY: 'auto',
          minHeight: '0'
        }}>
          {optLogs.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: '13px', fontStyle: 'italic' }}>
              No optimizations applied yet. (Enter arithmetic, constants or propagation mappings to trigger).
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {optLogs.map((log, idx) => (
                <div key={idx} style={{ 
                  background: 'rgba(245, 158, 11, 0.05)', 
                  border: '1px solid rgba(245, 158, 11, 0.15)', 
                  padding: '8px 10px', 
                  borderRadius: '6px',
                  fontSize: '12px'
                }}>
                  <div style={{ color: '#f59e0b', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}>
                    {log.pass} {log.line ? `[line ${log.line}]` : ''}
                  </div>
                  <div style={{ color: '#e5e7eb', marginTop: '2px', lineHeight: '1.4' }}>
                    {log.detail}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IrTab;
