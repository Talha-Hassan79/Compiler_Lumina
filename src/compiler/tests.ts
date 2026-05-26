import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { SemanticAnalyzer } from './semantics.js';
import { TACGenerator } from './tac.js';
import { TACOptimizer } from './optimizer.js';
import { TACVirtualMachine } from './vm.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passedTests++;
    console.log(`\x1b[32m[PASS]\x1b[0m ${message}`);
  } else {
    failedTests++;
    console.error(`\x1b[31m[FAIL]\x1b[0m ${message}`);
  }
}

function runTests(): void {
  console.log('================================================');
  console.log('            LUMINA COMPILER TEST SUITE          ');
  console.log('================================================\n');

  testLexer();
  testParser();
  testSemantics();
  testOptimizer();
  testVM();

  console.log('\n================================================');
  console.log(`Test Execution Finished. Passed: ${passedTests}, Failed: ${failedTests}`);
  console.log('================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

function testLexer(): void {
  console.log('--- Running Lexer Tests ---');
  const source = `
    let x: int = 42;
    const y: float = 3.14;
    let s: string = "hello \\n world";
    if (x == 42) { }
    @
  `;
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const errors = lexer.getErrors();

  assert(tokens.some(t => t.type === 'LET'), 'Identified keyword let');
  assert(tokens.some(t => t.type === 'CONST'), 'Identified keyword const');
  assert(tokens.some(t => t.type === 'INT_LIT' && t.value === '42'), 'Parsed int literal 42');
  assert(tokens.some(t => t.type === 'FLOAT_LIT' && t.value === '3.14'), 'Parsed float literal 3.14');
  assert(tokens.some(t => t.type === 'STRING_LIT' && t.value === 'hello \n world'), 'Parsed string literal with escape sequence');
  assert(tokens.some(t => t.type === 'DOUBLE_EQ'), 'Parsed equality operator');
  
  assert(errors.length === 1 && errors[0].message.includes("Illegal character '@'"), 'Caught lexical error on invalid symbol');
}

function testParser(): void {
  console.log('\n--- Running Parser Tests ---');
  const source = `
    let x: int = 10;
    let y: int // Syntax error: missing semicolon
    let z: int = 20;
  `;
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const errors = parser.getErrors();

  assert(ast.body.length === 2, 'Syntax boundary recovery: recovered and parsed surrounding statements');
  assert(errors.length > 0 && errors[0].message.includes("Expect ';' after variable declaration"), 'Caught parser error on missing semicolon');
}

function testSemantics(): void {
  console.log('\n--- Running Semantic Analysis Tests ---');
  const source = `
    let a: int = 10;
    a = "hello"; // Semantic error: type mismatch
    const PI: float = 3.14;
    PI = 3.15; // Semantic error: constant write
    let unusedVar: int = 5; // Semantic warning: unused variable
    let b: int = undeclaredVar + 2; // Semantic error: undeclared variable
  `;
  const lexer = new Lexer(source);
  const parser = new Parser(lexer.tokenize());
  const ast = parser.parse();

  const semantic = new SemanticAnalyzer();
  semantic.analyze(ast);
  const errors = semantic.getErrors();

  assert(
    errors.some(e => e.message.includes("Cannot assign type 'string' to variable 'a' of type 'int'")),
    'Caught semantic error: type mismatch assignment'
  );
  assert(
    errors.some(e => e.message.includes("Cannot reassign to constant 'PI'")),
    'Caught semantic error: constant reassignment'
  );
  assert(
    errors.some(e => e.message.includes("Use of undeclared variable 'undeclaredVar'")),
    'Caught semantic error: undeclared variable usage'
  );
  assert(
    errors.some(e => e.message.includes("Unused variable 'unusedVar'")),
    'Caught semantic warning: unused variable'
  );
}

function testOptimizer(): void {
  console.log('\n--- Running Optimizer Tests ---');
  const source = `
    let x: int = 2 + 3 * 4;
    let y: int = x;
    let z: int = 10;
  `;
  const lexer = new Lexer(source);
  const parser = new Parser(lexer.tokenize());
  const ast = parser.parse();

  const semantic = new SemanticAnalyzer();
  semantic.analyze(ast);

  const tacGen = new TACGenerator();
  const rawTac = tacGen.generate(ast);

  const optimizer = new TACOptimizer();
  const optimizedTac = optimizer.optimize(rawTac);

  // Raw TAC will contain MUL 3, 4 and ADD 2, t0.
  // Optimized TAC should collapse this.
  const hasFolded = optimizedTac.some(
    inst => inst.op === 'COPY' && inst.arg1 === '14' && inst.result === 'x'
  );
  assert(hasFolded, 'Constant folding successfully computed 2 + 3 * 4 -> 14');
}

function testVM(): void {
  console.log('\n--- Running Virtual Machine Tests ---');
  
  // Recursion: Factorial test program
  const source = `
    fn fact(n: int) -> int {
      if (n <= 1) {
        return 1;
      }
      return n * fact(n - 1);
    }

    let result: int = fact(5);
    print(result);
  `;

  const lexer = new Lexer(source);
  const parser = new Parser(lexer.tokenize());
  const ast = parser.parse();

  const semantic = new SemanticAnalyzer();
  semantic.analyze(ast);

  const tacGen = new TACGenerator();
  const rawTac = tacGen.generate(ast);

  const optimizer = new TACOptimizer();
  const optimizedTac = optimizer.optimize(rawTac);

  const vm = new TACVirtualMachine(optimizedTac);
  const state = vm.run();

  assert(state.globals['result'] === 120, 'Factorial of 5 resolved to 120');
  assert(state.console.includes('120'), 'VM console output printed 120');
}

// Execute
runTests();
