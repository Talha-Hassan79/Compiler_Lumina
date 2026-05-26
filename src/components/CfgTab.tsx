import React from 'react';
import { CFG } from '../compiler/cfg.js';

interface CfgTabProps {
  cfg: CFG | null;
}

const CfgTab: React.FC<CfgTabProps> = ({ cfg }) => {
  if (!cfg || cfg.blocks.length === 0) {
    return <div style={{ color: '#9ca3af' }}>No Control Flow Graph generated. Compile a correct program to view the CFG.</div>;
  }

  // Helper to get matching edges outgoing from a block
  const getOutgoingEdges = (blockId: string) => {
    return cfg.edges.filter(edge => edge.from === blockId);
  };

  return (
    <div style={{ padding: '8px 0', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: '16px', fontSize: '13px', color: '#9ca3af' }}>
        A Control Flow Graph divides the Three-Address Code into <strong>Basic Blocks</strong> (maximal straight-line code with single entry/exit) and maps out jump edges.
      </div>

      <div className="cfg-block-container">
        {cfg.blocks.map((block, idx) => {
          const outgoing = getOutgoingEdges(block.id);

          return (
            <React.Fragment key={block.id}>
              {/* Basic Block Card */}
              <div className="cfg-block">
                <div className="cfg-block-header">
                  <span>ID: {block.id}</span>
                  {block.label && <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>Label: {block.label}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '10px' }}>
                  {block.instructions.map((inst, i) => {
                    const opStr = inst.op.padEnd(10);
                    const args = `${inst.arg1 || ''}${inst.arg2 ? `, ${inst.arg2}` : ''}`;
                    const res = inst.result ? ` -> ${inst.result}` : '';
                    return (
                      <div key={i} style={{ color: '#e5e7eb', fontSize: '11px', whiteSpace: 'pre' }}>
                        <span style={{ color: '#a78bfa' }}>{opStr}</span>
                        <span style={{ color: '#d1d5db' }}>{args}</span>
                        <span style={{ color: '#38bdf8' }}>{res}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Edge outputs inside card */}
                {outgoing.length > 0 ? (
                  <div style={{ 
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
                    paddingTop: '8px', 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '4px',
                    fontSize: '9px'
                  }}>
                    {outgoing.map((edge, eIdx) => {
                      let color = '#9ca3af';
                      let bg = 'rgba(255,255,255,0.05)';
                      let label = '';

                      if (edge.type === 'conditional_true') {
                        color = '#10b981';
                        bg = 'rgba(16, 185, 129, 0.1)';
                        label = 'True -> ';
                      } else if (edge.type === 'conditional_false') {
                        color = '#f43f5e';
                        bg = 'rgba(244, 63, 94, 0.1)';
                        label = 'False -> ';
                      } else if (edge.type === 'unconditional') {
                        color = '#38bdf8';
                        bg = 'rgba(56, 189, 248, 0.1)';
                        label = 'Jump -> ';
                      } else if (edge.type === 'fallthrough') {
                        color = '#9ca3af';
                        bg = 'rgba(255,255,255,0.05)';
                        label = 'Fallthrough -> ';
                      }

                      return (
                        <span 
                          key={eIdx}
                          style={{
                            color,
                            background: bg,
                            border: `1px solid ${color}40`,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontWeight: '600'
                          }}
                        >
                          {label}{edge.to}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ 
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
                    paddingTop: '8px', 
                    color: '#f43f5e', 
                    fontSize: '9px', 
                    fontWeight: 'bold' 
                  }}>
                    Exit Block (Return)
                  </div>
                )}
              </div>

              {/* Connecting Flow Arrow (omit on last item if no successors, or draw generic connector) */}
              {idx < cfg.blocks.length - 1 && <div className="cfg-arrow" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default CfgTab;
