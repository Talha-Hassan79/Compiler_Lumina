import React from 'react';
import { LL1ParserTableGenerator, SAMPLE_GRAMMAR } from '../compiler/ll1.js';

const TableTab: React.FC = () => {
  const generator = new LL1ParserTableGenerator();
  const firstSets = generator.getFirstSets();
  const followSets = generator.getFollowSets();
  const parseTable = generator.getTable();

  const nonTerminals = SAMPLE_GRAMMAR.nonTerminals;
  // Exclude epsilon 'e' from parsing table columns, but make sure we have all others and '$'
  const terminals = SAMPLE_GRAMMAR.terminals.filter(t => t !== 'e');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ fontSize: '13px', color: '#9ca3af' }}>
        This page demonstrates formal compiler syntax analysis theory. Below is the computed <strong>FIRST</strong> and <strong>FOLLOW</strong> sets, alongside the generated <strong>LL(1) Parsing Table</strong> for a classic arithmetic expression grammar.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Grammar Rules Box */}
        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#a78bfa', textTransform: 'uppercase' }}>
            Context-Free Grammar (CFG) Rules
          </h3>
          <ul style={{ listStyle: 'none', fontFamily: 'monospace', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {SAMPLE_GRAMMAR.productions.map((p, idx) => (
              <li key={idx} style={{ color: '#e5e7eb' }}>
                <span style={{ color: '#38bdf8' }}>{p.lhs}</span> &rarr; {p.rhs.join(' ')}
              </li>
            ))}
          </ul>
        </div>

        {/* First & Follow Sets Box */}
        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#a78bfa', textTransform: 'uppercase' }}>
            First & Follow Sets
          </h3>
          <table className="data-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th>Non-Terminal</th>
                <th>FIRST Set</th>
                <th>FOLLOW Set</th>
              </tr>
            </thead>
            <tbody>
              {nonTerminals.map(nt => (
                <tr key={nt} style={{ fontFamily: 'monospace' }}>
                  <td style={{ color: '#38bdf8', fontWeight: 'bold' }}>{nt}</td>
                  <td style={{ color: '#10b981' }}>{`{ ${firstSets[nt].join(', ')} }`}</td>
                  <td style={{ color: '#f59e0b' }}>{`{ ${followSets[nt].join(', ')} }`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* LL(1) Parsing Table Box */}
      <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#a78bfa', textTransform: 'uppercase' }}>
          Generated LL(1) Parsing Table
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ textAlign: 'center', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', color: '#9ca3af' }}>Non-Terminal</th>
                {terminals.map(t => (
                  <th key={t} style={{ textAlign: 'center', fontFamily: 'monospace', color: '#f3f4f6' }}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nonTerminals.map(nt => (
                <tr key={nt}>
                  <td style={{ textAlign: 'left', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 'bold', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                    {nt}
                  </td>
                  {terminals.map(t => {
                    const cellVal = parseTable[nt]?.[t];
                    return (
                      <td 
                        key={t} 
                        style={{ 
                          fontFamily: 'monospace', 
                          color: cellVal ? '#e5e7eb' : 'transparent',
                          background: cellVal ? 'rgba(139, 92, 246, 0.05)' : 'transparent',
                          border: cellVal ? '1px solid rgba(139, 92, 246, 0.15)' : 'none',
                          padding: '10px'
                        }}
                      >
                        {cellVal || '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TableTab;
