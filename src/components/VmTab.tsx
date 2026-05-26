import React, { useState, useEffect, useRef } from 'react';
import { TACInstruction } from '../compiler/tac.js';
import { TACVirtualMachine, VMState } from '../compiler/vm.js';

interface VmTabProps {
  optimizedTac: TACInstruction[];
}

const VmTab: React.FC<VmTabProps> = ({ optimizedTac }) => {
  const [vm, setVm] = useState<TACVirtualMachine | null>(null);
  const [vmState, setVmState] = useState<VMState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(300); // ms per step
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Initialize/Reset VM on instructions change
  const handleReset = () => {
    setIsPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const newVm = new TACVirtualMachine(optimizedTac);
    setVm(newVm);
    setVmState(newVm.getState());
  };

  useEffect(() => {
    handleReset();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [optimizedTac]);

  // Sync scroll on console output
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [vmState?.console]);

  // Auto-play steps loop
  useEffect(() => {
    if (isPlaying && vm && vmState && !vmState.isFinished) {
      timerRef.current = setInterval(() => {
        const nextState = vm.step();
        setVmState(nextState);
        if (nextState.isFinished) {
          setIsPlaying(false);
        }
      }, playSpeed);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, playSpeed, vm, vmState]);

  const handleStep = () => {
    if (vm && vmState && !vmState.isFinished) {
      const nextState = vm.step();
      setVmState(nextState);
    }
  };

  const handleRunToCompletion = () => {
    if (vm && vmState && !vmState.isFinished) {
      setIsPlaying(false);
      const finalState = vm.run();
      setVmState(finalState);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  if (optimizedTac.length === 0) {
    return <div style={{ color: '#9ca3af' }}>No executable code. Compile source code first.</div>;
  }

  // Get active instruction context around ip
  const ip = vmState?.ip ?? 0;
  const surroundingInstructions = optimizedTac.map((inst, index) => ({
    index,
    inst,
    isActive: index === ip,
  }));

  // Filter instructions around the active index
  const startVisible = Math.max(0, ip - 2);
  const endVisible = Math.min(optimizedTac.length, ip + 3);
  const visibleInstructions = surroundingInstructions.slice(startVisible, endVisible);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      
      {/* Controls Bar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        background: 'rgba(255,255,255,0.02)', 
        border: '1px solid var(--glass-border)', 
        padding: '12px 16px', 
        borderRadius: '8px'
      }}>
        {/* Step controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isPlaying ? (
            <button className="btn btn-secondary" onClick={handlePause}>
              ⏸ Pause
            </button>
          ) : (
            <button 
              className="btn btn-success" 
              onClick={() => setIsPlaying(true)}
              disabled={vmState?.isFinished}
            >
              ▶ Auto Step
            </button>
          )}

          <button 
            className="btn btn-secondary" 
            onClick={handleStep}
            disabled={vmState?.isFinished || isPlaying}
          >
            ⏭ Step Forward
          </button>

          <button 
            className="btn btn-primary" 
            onClick={handleRunToCompletion}
            disabled={vmState?.isFinished || isPlaying}
          >
            ⚡ Run to End
          </button>

          <button className="btn btn-secondary" onClick={handleReset}>
            🔄 Reset
          </button>
        </div>

        {/* Playback speed slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>Step Speed:</span>
          <input 
            type="range" 
            min="50" 
            max="1000" 
            step="50"
            value={playSpeed} 
            onChange={(e) => setPlaySpeed(Number(e.target.value))}
            style={{ accentColor: 'var(--accent-purple)', width: '120px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#a78bfa', width: '45px' }}>
            {playSpeed}ms
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Left Side: Active instruction and stdout console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Active instruction Context */}
          <div style={{ 
            background: 'rgba(0,0,0,0.2)', 
            border: '1px solid var(--glass-border)', 
            borderRadius: '8px', 
            padding: '12px' 
          }}>
            <div className="vm-panel-title">Active Instruction Tracer</div>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              fontFamily: 'var(--font-mono)', 
              fontSize: '12px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '6px',
              padding: '6px',
              overflow: 'hidden'
            }}>
              {visibleInstructions.map(({ index, inst, isActive }) => {
                const opStr = inst.op.padEnd(14);
                const args = `${inst.arg1 || '-'}`.padEnd(10) + `${inst.arg2 || '-'}`.padEnd(10);
                const res = inst.result || '-';
                const output = `${index.toString().padEnd(4)}: ${opStr} arg1: ${args} res: ${res}`;

                return (
                  <div 
                    key={index} 
                    className={isActive ? 'active-instruction-highlight' : ''}
                    style={{ 
                      padding: '4px 10px', 
                      color: isActive ? '#fff' : '#9ca3af',
                      fontWeight: isActive ? 'bold' : 'normal'
                    }}
                  >
                    {output}
                  </div>
                );
              })}
              {vmState?.isFinished && (
                <div style={{ padding: '6px 10px', color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>
                  ✔ Execution Complete
                </div>
              )}
            </div>
          </div>

          {/* Standard Output (Console) */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="vm-panel-title" style={{ marginBottom: '4px' }}>Stdout Streams Terminal</div>
            <div className="vm-console">
              {vmState?.console.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
              <div ref={consoleEndRef} />
              {vmState?.console.length === 0 && <span style={{ opacity: 0.4 }}>(program execution output console)</span>}
            </div>
          </div>

        </div>

        {/* Right Side: Variables memory and Call Stack frame */}
        <div className="vm-state-grid" style={{ marginTop: 0 }}>
          
          {/* Global variables register */}
          <div className="vm-panel-small" style={{ height: '345px' }}>
            <div className="vm-panel-title">Global Variables Memory</div>
            {vmState && Object.keys(vmState.globals).length === 0 ? (
              <div style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '12px' }}>(no globals stored)</div>
            ) : (
              <table className="data-table" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {vmState && Object.entries(vmState.globals).map(([key, value]) => (
                    <tr key={key}>
                      <td style={{ fontFamily: 'monospace', color: '#38bdf8', fontWeight: 'bold' }}>{key}</td>
                      <td style={{ fontFamily: 'monospace', color: '#e5e7eb' }}>{JSON.stringify(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Stack Frames Explorer */}
          <div className="vm-panel-small" style={{ height: '345px' }}>
            <div className="vm-panel-title">Call Stack Frames ({vmState?.stack.length ?? 0})</div>
            {vmState && vmState.stack.length === 0 ? (
              <div style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '12px' }}>
                (stack empty - execution inside main body scope)
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '8px' }}>
                {vmState?.stack.map((frame, frameIdx) => (
                  <div 
                    key={frameIdx} 
                    style={{ 
                      background: 'rgba(139, 92, 246, 0.05)', 
                      border: '1px solid rgba(139, 92, 246, 0.2)', 
                      borderRadius: '6px', 
                      padding: '8px 10px',
                      fontFamily: 'monospace',
                      fontSize: '11px'
                    }}
                  >
                    <div style={{ color: '#a78bfa', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '3px', marginBottom: '5px' }}>
                      Frame {frameIdx}: {frame.fnName}()
                    </div>
                    <div>Return IP: {frame.returnAddress}</div>
                    
                    {/* Frame locals */}
                    <div style={{ marginTop: '4px' }}>
                      <div style={{ color: '#9ca3af', textDecoration: 'underline', fontSize: '10px' }}>Locals:</div>
                      {Object.entries(frame.locals).map(([name, val]) => (
                        <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                          <span style={{ color: '#38bdf8' }}>{name}</span>
                          <span style={{ color: '#e5e7eb' }}>{JSON.stringify(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default VmTab;
