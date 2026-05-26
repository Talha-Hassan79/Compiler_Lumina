import React, { useState } from 'react';
import Editor from './components/Editor.js';
import LexerTab from './components/LexerTab.js';
import ParserTab from './components/ParserTab.js';
import SemanticsTab from './components/SemanticsTab.js';
import IrTab from './components/IrTab.js';
import CfgTab from './components/CfgTab.js';
import TableTab from './components/TableTab.js';
import VmTab from './components/VmTab.js';

import { Lexer } from './compiler/lexer.js';
import { Parser } from './compiler/parser.js';
import { serializeAST } from './compiler/ast.js';
import { SemanticAnalyzer } from './compiler/semantics.js';
import { TACGenerator } from './compiler/tac.js';
import { TACOptimizer } from './compiler/optimizer.js';
import { CFGBuilder } from './compiler/cfg.js';

// Pre-defined sample programs for instant loading
const SAMPLES = {
  factorial: `// Lumina Sample Program: Recursive Factorial
// Demonstrates recursive functions, conditionals, and math.

fn factorial(n: int) -> int {
  if (n <= 1) {
    return 1;
  }
  return n * factorial(n - 1);
}

let num: int = 5;
let result: int = factorial(num);

print("The factorial of 5 is:");
print(result);
`,
  fibonacci: `// Lumina Sample Program: Iterative Fibonacci Sequence
// Demonstrates loops, variable assignment, and printing.

let limit: int = 10;
let a: int = 0;
let b: int = 1;
let count: int = 0;

print("Iterative Fibonacci sequence first 10 terms:");

while (count < limit) {
  print(a);
  let temp: int = a + b;
  a = b;
  b = temp;
  count = count + 1;
}
`,
  error_demo: `// Lumina Error Demonstration Program
// Displays Lexical, Syntax, and Type issues, showing compiler warnings/errors list.

// 1. Lexical Error: illegal characters
let illegalChar: int = @; 

// 2. Syntax/Parser Error: Missing semicolon
let valOne: int = 100
let valTwo: int = 200; // Parser recovers and successfully parses this!

// 3. Semantic Error: Redeclaration
let valTwo: int = 300; 

// 4. Semantic Error: Type mismatch
let text: string = "hello";
let badAssign: int = text; 

// 5. Semantic Error: Constant re-assignment
const PI: float = 3.14;
PI = 3.14159; 

// 6. Semantic Error: Undeclared variable usage
let finalSum: int = valTwo + undefinedVar;

// 7. Semantic Warning: Unused variable
let unusedVar: bool = true;
print("Finished loading compiler error demonstrations.");
`,
};

type TabType = 'lexer' | 'parser' | 'semantics' | 'ir' | 'cfg' | 'table' | 'vm';

const App: React.FC = () => {
  const [code, setCode] = useState<string>(SAMPLES.factorial);
  const [selectedTab, setSelectedTab] = useState<TabType>('vm');
  const [activeSample, setActiveSample] = useState<string>('factorial');

  // Load sample program helper
  const handleSampleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value as keyof typeof SAMPLES;
    setCode(SAMPLES[key]);
    setActiveSample(key);
  };

  // ==========================================
  //         COMPILER EXECUTION PIPELINE
  // ==========================================

  // 1. Run Lexical Analysis
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const lexerErrors = lexer.getErrors();

  // 2. Run Syntax Analysis (Parser)
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const parserErrors = parser.getErrors();

  // 3. Run Semantic Analysis (only if there are no lexer or parser errors)
  const hasSyntaxErrors = lexerErrors.length > 0 || parserErrors.length > 0;
  const semantic = new SemanticAnalyzer();
  if (!hasSyntaxErrors) {
    semantic.analyze(ast);
  }
  const semanticErrors = !hasSyntaxErrors ? semantic.getErrors() : [];

  // Aggregate errors
  const allErrors = [...lexerErrors, ...parserErrors, ...semanticErrors];

  // Serialize AST for visual display
  const astData = !hasSyntaxErrors ? serializeAST(ast) : null;
  const symbolTableData = !hasSyntaxErrors ? semantic.getSymbolTable().serialize() : null;

  // 4. TAC Generation
  const tacGen = new TACGenerator();
  const rawTac = !hasSyntaxErrors ? tacGen.generate(ast) : [];

  // 5. Optimization
  const optimizer = new TACOptimizer();
  const optimizedTac = !hasSyntaxErrors ? optimizer.optimize(rawTac) : [];
  const optLogs = !hasSyntaxErrors ? optimizer.getLogs() : [];

  // 6. CFG Building
  const cfgBuilder = new CFGBuilder();
  const cfg = !hasSyntaxErrors ? cfgBuilder.build(optimizedTac) : null;

  return (
    <div className="app-container">
      
      {/* HEADER SECTION */}
      <header className="header">
        <div className="logo-container">
          <span className="logo-icon">⚡</span>
          <div>
            <h1 className="logo-text">Lumina</h1>
            <span className="logo-subtitle">industrial-grade compiler v1.0.0</span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sample Program:</span>
          <select 
            className="sample-select" 
            value={activeSample} 
            onChange={handleSampleChange}
          >
            <option value="factorial">factorial.lum (Recursion)</option>
            <option value="fibonacci">fibonacci.lum (Loops)</option>
            <option value="error_demo">error_demo.lum (Error recovery)</option>
          </select>
        </div>
      </header>

      {/* WORKSPACE SECTION */}
      <main className="workspace">
        
        {/* LEFT PANEL: Source Code Editor */}
        <section className="glass-panel" style={{ height: '100%' }}>
          <div className="panel-header">
            <div className="panel-title">Lumina Editor</div>
            {allErrors.length > 0 && (
              <span className="error-badge">
                {allErrors.filter(e => !e.message.startsWith('Warning:')).length} Errors, {allErrors.filter(e => e.message.startsWith('Warning:')).length} Warnings
              </span>
            )}
            {allErrors.length === 0 && (
              <span style={{ color: 'var(--accent-green)', fontSize: '11px', fontWeight: 'bold' }}>
                ✔ Compilation successful
              </span>
            )}
          </div>
          <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', padding: '12px' }}>
            <Editor 
              value={code} 
              onChange={setCode} 
              errors={allErrors}
            />
          </div>
        </section>

        {/* RIGHT PANEL: Compilation Pipeline Tabs */}
        <section className="glass-panel" style={{ height: '100%' }}>
          {/* Tabs Navigation */}
          <nav className="tabs-container">
            <button 
              className={`tab-btn ${selectedTab === 'lexer' ? 'active' : ''}`}
              onClick={() => setSelectedTab('lexer')}
            >
              Lexer (Tokens)
            </button>
            <button 
              className={`tab-btn ${selectedTab === 'parser' ? 'active' : ''}`}
              onClick={() => setSelectedTab('parser')}
            >
              Parser (AST)
            </button>
            <button 
              className={`tab-btn ${selectedTab === 'semantics' ? 'active' : ''}`}
              onClick={() => setSelectedTab('semantics')}
            >
              Semantics & Symbols
            </button>
            <button 
              className={`tab-btn ${selectedTab === 'ir' ? 'active' : ''}`}
              onClick={() => setSelectedTab('ir')}
            >
              IR & Optimizer
            </button>
            <button 
              className={`tab-btn ${selectedTab === 'cfg' ? 'active' : ''}`}
              onClick={() => setSelectedTab('cfg')}
            >
              Control Flow Graph
            </button>
            <button 
              className={`tab-btn ${selectedTab === 'table' ? 'active' : ''}`}
              onClick={() => setSelectedTab('table')}
            >
              Parsing Theory
            </button>
            <button 
              className={`tab-btn ${selectedTab === 'vm' ? 'active' : ''}`}
              onClick={() => setSelectedTab('vm')}
            >
              VM Debugger
            </button>
          </nav>

          {/* Active Tab Panel Content */}
          <div className="panel-content">
            {selectedTab === 'lexer' && (
              <LexerTab tokens={tokens} />
            )}
            {selectedTab === 'parser' && (
              <ParserTab astData={astData} />
            )}
            {selectedTab === 'semantics' && (
              <SemanticsTab 
                symbolTableData={symbolTableData} 
                errors={allErrors}
              />
            )}
            {selectedTab === 'ir' && (
              <IrTab 
                rawTac={rawTac} 
                optTac={optimizedTac} 
                optLogs={optLogs}
              />
            )}
            {selectedTab === 'cfg' && (
              <CfgTab cfg={cfg} />
            )}
            {selectedTab === 'table' && (
              <TableTab />
            )}
            {selectedTab === 'vm' && (
              <VmTab optimizedTac={optimizedTac} />
            )}
          </div>
        </section>

      </main>

    </div>
  );
};

export default App;
