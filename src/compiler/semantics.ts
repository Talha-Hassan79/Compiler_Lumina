import { CompilerError } from './lexer.js';
import {
  Program,
  Statement,
  Expression,
  DataType,
  BlockStatement,
} from './ast.js';

export interface SymbolInfo {
  name: string;
  kind: 'variable' | 'constant' | 'function' | 'parameter';
  dataType: DataType;
  isConst: boolean;
  used: boolean;
  paramTypes?: DataType[]; // For functions
  returnType?: DataType;  // For functions
  line: number;
  column: number;
}

export class SymbolTable {
  public name: string;
  public parent: SymbolTable | null = null;
  public symbols: Map<string, SymbolInfo> = new Map();
  public children: SymbolTable[] = [];

  constructor(name: string, parent: SymbolTable | null = null) {
    this.name = name;
    this.parent = parent;
    if (parent) {
      parent.children.push(this);
    }
  }

  define(info: SymbolInfo): boolean {
    if (this.symbols.has(info.name)) {
      return false; // Already declared in this local scope
    }
    this.symbols.set(info.name, info);
    return true;
  }

  lookup(name: string): SymbolInfo | null {
    const symbol = this.symbols.get(name);
    if (symbol) {
      return symbol;
    }
    if (this.parent) {
      return this.parent.lookup(name);
    }
    return null;
  }

  // Serializer for frontend display
  serialize(): any {
    const symbolsList = Array.from(this.symbols.values()).map(s => ({
      name: s.name,
      kind: s.kind,
      dataType: s.dataType,
      isConst: s.isConst,
      used: s.used,
      line: s.line,
      column: s.column,
    }));

    return {
      name: this.name,
      symbols: symbolsList,
      children: this.children.map(c => c.serialize()),
    };
  }
}

export class SemanticAnalyzer {
  private globalScope: SymbolTable;
  private currentScope: SymbolTable;
  private errors: CompilerError[] = [];
  private currentReturnType: DataType = 'void';

  constructor() {
    this.globalScope = new SymbolTable('Global');
    this.currentScope = this.globalScope;
    this.setupBuiltins();
  }

  getErrors(): CompilerError[] {
    return this.errors;
  }

  getSymbolTable(): SymbolTable {
    return this.globalScope;
  }

  private setupBuiltins(): void {
    // print() function which accepts arguments and returns void
    // For convenience we register dynamic prints
    this.globalScope.define({
      name: 'print',
      kind: 'function',
      dataType: 'void',
      isConst: true,
      used: true,
      paramTypes: [], // dynamic matching
      returnType: 'void',
      line: 0,
      column: 0,
    });
  }

  analyze(program: Program): void {
    for (const stmt of program.body) {
      this.analyzeStatement(stmt);
    }
    this.checkUnusedVariables(this.globalScope);
  }

  private analyzeStatement(stmt: Statement): void {
    switch (stmt.type) {
      case 'LetStatement': {
        if (stmt.init) {
          const initType = this.analyzeExpression(stmt.init);
          if (initType !== 'void' && initType !== stmt.dataType) {
            this.reportError(
              `Type mismatch: Cannot assign '${initType}' to variable of type '${stmt.dataType}'`,
              stmt.line,
              stmt.column
            );
          }
        }
        const success = this.currentScope.define({
          name: stmt.name,
          kind: 'variable',
          dataType: stmt.dataType,
          isConst: false,
          used: false,
          line: stmt.line,
          column: stmt.column,
        });
        if (!success) {
          this.reportError(`Redeclaration of variable '${stmt.name}'`, stmt.line, stmt.column);
        }
        break;
      }
      case 'ConstStatement': {
        const initType = this.analyzeExpression(stmt.init);
        if (initType !== stmt.dataType) {
          this.reportError(
            `Type mismatch: Cannot assign '${initType}' to constant of type '${stmt.dataType}'`,
            stmt.line,
            stmt.column
          );
        }
        const success = this.currentScope.define({
          name: stmt.name,
          kind: 'constant',
          dataType: stmt.dataType,
          isConst: true,
          used: false,
          line: stmt.line,
          column: stmt.column,
        });
        if (!success) {
          this.reportError(`Redeclaration of constant '${stmt.name}'`, stmt.line, stmt.column);
        }
        break;
      }
      case 'AssignStatement': {
        const symbol = this.currentScope.lookup(stmt.name);
        if (!symbol) {
          this.reportError(`Use of undeclared variable '${stmt.name}'`, stmt.line, stmt.column);
          break;
        }
        if (symbol.isConst) {
          this.reportError(`Cannot reassign to constant '${stmt.name}'`, stmt.line, stmt.column);
        }
        symbol.used = true;
        const valType = this.analyzeExpression(stmt.value);
        if (valType !== symbol.dataType) {
          this.reportError(
            `Type mismatch: Cannot assign type '${valType}' to variable '${stmt.name}' of type '${symbol.dataType}'`,
            stmt.line,
            stmt.column
          );
        }
        break;
      }
      case 'IfStatement': {
        const condType = this.analyzeExpression(stmt.condition);
        if (condType !== 'bool') {
          this.reportError(`Condition of 'if' must be a boolean, got '${condType}'`, stmt.line, stmt.column);
        }
        this.analyzeBlock(stmt.thenBranch, 'if-then');
        if (stmt.elseBranch) {
          this.analyzeBlock(stmt.elseBranch, 'if-else');
        }
        break;
      }
      case 'WhileStatement': {
        const condType = this.analyzeExpression(stmt.condition);
        if (condType !== 'bool') {
          this.reportError(`Condition of 'while' must be a boolean, got '${condType}'`, stmt.line, stmt.column);
        }
        this.analyzeBlock(stmt.body, 'while-body');
        break;
      }
      case 'ReturnStatement': {
        let returnType: DataType = 'void';
        if (stmt.value) {
          returnType = this.analyzeExpression(stmt.value);
        }
        if (returnType !== this.currentReturnType) {
          this.reportError(
            `Type mismatch: Function return type is '${this.currentReturnType}', but returned '${returnType}'`,
            stmt.line,
            stmt.column
          );
        }
        break;
      }
      case 'FunctionDeclaration': {
        const paramTypes = stmt.params.map(p => p.dataType);
        
        // Register function in the current scope (global)
        const success = this.currentScope.define({
          name: stmt.name,
          kind: 'function',
          dataType: stmt.returnType,
          isConst: true,
          used: true,
          paramTypes,
          returnType: stmt.returnType,
          line: stmt.line,
          column: stmt.column,
        });

        if (!success) {
          this.reportError(`Redeclaration of function '${stmt.name}'`, stmt.line, stmt.column);
        }

        // Enter function scope
        const parentScope = this.currentScope;
        this.currentScope = new SymbolTable(`fn ${stmt.name}`, parentScope);
        const prevReturnType = this.currentReturnType;
        this.currentReturnType = stmt.returnType;

        // Declare parameters as local variables inside function scope
        for (const param of stmt.params) {
          const pSuccess = this.currentScope.define({
            name: param.name,
            kind: 'parameter',
            dataType: param.dataType,
            isConst: false,
            used: false,
            line: param.line,
            column: param.column,
          });
          if (!pSuccess) {
            this.reportError(`Duplicate parameter name '${param.name}' in function '${stmt.name}'`, param.line, param.column);
          }
        }

        // Analyze function body statements (no need to call analyzeBlock since we already created the scope and will traverse body manually)
        for (const s of stmt.body.body) {
          this.analyzeStatement(s);
        }

        this.checkUnusedVariables(this.currentScope);

        // Restore scope and return type
        this.currentScope = parentScope;
        this.currentReturnType = prevReturnType;
        break;
      }
      case 'ExpressionStatement': {
        this.analyzeExpression(stmt.expression);
        break;
      }
      case 'BlockStatement': {
        this.analyzeBlock(stmt, 'block');
        break;
      }
    }
  }

  private analyzeBlock(block: BlockStatement, scopeName: string): void {
    const parentScope = this.currentScope;
    this.currentScope = new SymbolTable(scopeName, parentScope);

    for (const stmt of block.body) {
      this.analyzeStatement(stmt);
    }

    this.checkUnusedVariables(this.currentScope);
    this.currentScope = parentScope;
  }

  private analyzeExpression(expr: Expression): DataType {
    switch (expr.type) {
      case 'LiteralExpression':
        return expr.valueType;

      case 'IdentifierExpression': {
        const symbol = this.currentScope.lookup(expr.name);
        if (!symbol) {
          this.reportError(`Use of undeclared variable '${expr.name}'`, expr.line, expr.column);
          return 'void';
        }
        symbol.used = true;
        return symbol.dataType;
      }

      case 'UnaryExpression': {
        const rType = this.analyzeExpression(expr.right);
        if (expr.op === '-') {
          if (rType !== 'int' && rType !== 'float') {
            this.reportError(`Unary minus cannot be applied to type '${rType}', expects number`, expr.line, expr.column);
          }
          return rType;
        }
        if (expr.op === '!') {
          if (rType !== 'bool') {
            this.reportError(`Unary negation '!' cannot be applied to type '${rType}', expects boolean`, expr.line, expr.column);
          }
          return 'bool';
        }
        return 'void';
      }

      case 'BinaryExpression': {
        const leftType = this.analyzeExpression(expr.left);
        const rightType = this.analyzeExpression(expr.right);

        // Arithmetic
        if (['+', '-', '*', '/', '%'].includes(expr.op)) {
          if (expr.op === '+' && leftType === 'string' && rightType === 'string') {
            return 'string'; // String concatenation
          }
          if ((leftType === 'int' || leftType === 'float') && (rightType === 'int' || rightType === 'float')) {
            if (leftType !== rightType) {
              // Strict typing rules or implicit casting? Let's check matching, or return float if any is float
              return 'float';
            }
            return leftType;
          }
          this.reportError(
            `Operator '${expr.op}' cannot be applied to operands of types '${leftType}' and '${rightType}'`,
            expr.line,
            expr.column
          );
          return 'void';
        }

        // Logical
        if (['&&', '||'].includes(expr.op)) {
          if (leftType !== 'bool' || rightType !== 'bool') {
            this.reportError(`Logical operators require boolean operands, got '${leftType}' and '${rightType}'`, expr.line, expr.column);
          }
          return 'bool';
        }

        // Relational
        if (['<', '<=', '>', '>='].includes(expr.op)) {
          if (
            (leftType !== 'int' && leftType !== 'float') ||
            (rightType !== 'int' && rightType !== 'float')
          ) {
            this.reportError(`Relational operators require numeric operands, got '${leftType}' and '${rightType}'`, expr.line, expr.column);
          }
          return 'bool';
        }

        // Equalities
        if (['==', '!='].includes(expr.op)) {
          if (leftType !== rightType) {
            this.reportError(`Equality check requires matching types, got '${leftType}' and '${rightType}'`, expr.line, expr.column);
          }
          return 'bool';
        }

        return 'void';
      }

      case 'CallExpression': {
        const symbol = this.currentScope.lookup(expr.callee);
        if (!symbol) {
          this.reportError(`Call to undefined function '${expr.callee}'`, expr.line, expr.column);
          return 'void';
        }

        if (symbol.kind !== 'function') {
          this.reportError(`Cannot call non-function symbol '${expr.callee}'`, expr.line, expr.column);
          return 'void';
        }

        // Custom validation for built-in print()
        if (expr.callee === 'print') {
          // print takes any expression
          for (const arg of expr.args) {
            this.analyzeExpression(arg);
          }
          return 'void';
        }

        const argTypes = expr.args.map(arg => this.analyzeExpression(arg));
        const expectedTypes = symbol.paramTypes || [];

        if (argTypes.length !== expectedTypes.length) {
          this.reportError(
            `Function '${expr.callee}' expects ${expectedTypes.length} arguments, got ${argTypes.length}`,
            expr.line,
            expr.column
          );
        } else {
          for (let i = 0; i < argTypes.length; i++) {
            if (argTypes[i] !== expectedTypes[i]) {
              this.reportError(
                `Argument ${i + 1} of '${expr.callee}' expects type '${expectedTypes[i]}', got '${argTypes[i]}'`,
                expr.args[i].line,
                expr.args[i].column
              );
            }
          }
        }

        return symbol.returnType || 'void';
      }
    }
  }

  private reportError(message: string, line: number, column: number): void {
    this.errors.push({
      type: 'SEMANTIC',
      message,
      line,
      column,
      length: 1, // simplified
    });
  }

  private checkUnusedVariables(scope: SymbolTable): void {
    for (const [name, sym] of scope.symbols.entries()) {
      if (!sym.used && sym.kind !== 'function' && name !== 'print') {
        // We log a warning as a compiler semantic message (which is fine to report in errors but we can label it differently)
        this.errors.push({
          type: 'SEMANTIC',
          message: `Warning: Unused ${sym.kind} '${name}'`,
          line: sym.line,
          column: sym.column,
          length: name.length,
        });
      }
    }
  }
}
