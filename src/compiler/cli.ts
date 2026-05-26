import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { SemanticAnalyzer } from './semantics.js';
import { TACGenerator } from './tac.js';
import { TACOptimizer } from './optimizer.js';
import { TACVirtualMachine } from './vm.js';

function printHelp(): void {
  console.log(`
LUMINA COMPILER CLI
Usage: npm run cli -- <filename.lum> [options]

Options:
  --tokens      Print the lexical tokens table
  --ast         Print the Abstract Syntax Tree (AST)
  --symbols     Print the resolved symbol table scope tree
  --tac         Print the generated Three-Address Code (TAC)
  --opt-tac     Print the optimized Three-Address Code
  --opts        Print the optimization passes logs
  --help, -h    Show this help menu
`);
}

function run(): void {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const filePathArg = args.find((arg: string) => !arg.startsWith('--'));
  if (!filePathArg) {
    console.error('Error: No source file provided.');
    printHelp();
    process.exit(1);
  }

  const absolutePath = path.resolve(process.cwd(), filePathArg);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: Source file not found at '${absolutePath}'`);
    process.exit(1);
  }

  const source = fs.readFileSync(absolutePath, 'utf8');

  console.log(`Compiling '${filePathArg}'...\n`);

  // 1. Lexical Analysis
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const lexerErrors = lexer.getErrors();

  if (lexerErrors.length > 0) {
    console.error(`\x1b[31m[Lexer Errors found: ${lexerErrors.length}]\x1b[0m`);
    lexerErrors.forEach(e => console.error(`  Line ${e.line}:${e.column} - ${e.message}`));
  }

  if (args.includes('--tokens')) {
    console.log('=== TOKENS ===');
    console.table(tokens.map(t => ({ type: t.type, value: t.value, line: t.line, col: t.column })));
    console.log();
  }

  // 2. Syntax Analysis
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const parserErrors = parser.getErrors();

  if (parserErrors.length > 0) {
    console.error(`\x1b[31m[Parser Errors found: ${parserErrors.length}]\x1b[0m`);
    parserErrors.forEach(e => console.error(`  Line ${e.line}:${e.column} - ${e.message}`));
  }

  if (args.includes('--ast')) {
    console.log('=== ABSTRACT SYNTAX TREE (AST) ===');
    console.log(JSON.stringify(ast, null, 2));
    console.log();
  }

  // Stop if syntax errors occurred
  if (lexerErrors.length > 0 || parserErrors.length > 0) {
    console.error('\x1b[31mCompilation failed due to lexical/syntax errors.\x1b[0m');
    process.exit(1);
  }

  // 3. Semantic Analysis
  const semantic = new SemanticAnalyzer();
  semantic.analyze(ast);
  const semanticErrors = semantic.getErrors();

  const warnings = semanticErrors.filter(e => e.message.startsWith('Warning:'));
  const realErrors = semanticErrors.filter(e => !e.message.startsWith('Warning:'));

  if (warnings.length > 0) {
    console.warn(`\x1b[33m[Warnings found: ${warnings.length}]\x1b[0m`);
    warnings.forEach(w => console.warn(`  Line ${w.line}:${w.column} - ${w.message}`));
  }

  if (realErrors.length > 0) {
    console.error(`\x1b[31m[Semantic Errors found: ${realErrors.length}]\x1b[0m`);
    realErrors.forEach(e => console.error(`  Line ${e.line}:${e.column} - ${e.message}`));
    console.error('\x1b[31mCompilation failed due to semantic errors.\x1b[0m');
    process.exit(1);
  }

  if (args.includes('--symbols')) {
    console.log('=== SYMBOL TABLE ===');
    console.log(JSON.stringify(semantic.getSymbolTable().serialize(), null, 2));
    console.log();
  }

  // 4. TAC Generation
  const tacGen = new TACGenerator();
  const rawTac = tacGen.generate(ast);

  if (args.includes('--tac')) {
    console.log('=== RAW THREE-ADDRESS CODE ===');
    rawTac.forEach((inst, idx) => {
      const lineStr = inst.line ? `[line ${inst.line}]` : '';
      console.log(`${idx.toString().padEnd(4)}: ${inst.op.padEnd(15)} arg1: ${(inst.arg1 || '-').padEnd(10)} arg2: ${(inst.arg2 || '-').padEnd(10)} res: ${inst.result || '-'} ${lineStr}`);
    });
    console.log();
  }

  // 5. Optimization
  const optimizer = new TACOptimizer();
  const optimizedTac = optimizer.optimize(rawTac);

  if (args.includes('--opts')) {
    console.log('=== OPTIMIZATION PASSES ===');
    optimizer.getLogs().forEach(log => console.log(`  [${log.pass}] ${log.detail}`));
    console.log();
  }

  if (args.includes('--opt-tac')) {
    console.log('=== OPTIMIZED THREE-ADDRESS CODE ===');
    optimizedTac.forEach((inst, idx) => {
      const lineStr = inst.line ? `[line ${inst.line}]` : '';
      console.log(`${idx.toString().padEnd(4)}: ${inst.op.padEnd(15)} arg1: ${(inst.arg1 || '-').padEnd(10)} arg2: ${(inst.arg2 || '-').padEnd(10)} res: ${inst.result || '-'} ${lineStr}`);
    });
    console.log();
  }

  // 6. Execution in VM
  console.log('=== EXECUTING PROGRAM IN VIRTUAL MACHINE ===');
  const vm = new TACVirtualMachine(optimizedTac);
  const vmState = vm.run();

  console.log('\n--- VM Console Output ---');
  if (vmState.console.length > 0) {
    vmState.console.forEach(line => console.log(line));
  } else {
    console.log('(No console output)');
  }
  console.log('-------------------------');

  console.log(`\nExecution finished in ${vmState.stepsCount} VM instructions.`);
}

run();
