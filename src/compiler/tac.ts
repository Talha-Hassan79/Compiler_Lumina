import {
  Program,
  Statement,
  Expression,
  BlockStatement,
} from './ast.js';

export type TACOp =
  | 'ADD' | 'SUB' | 'MUL' | 'DIV' | 'MOD'
  | 'COPY'
  | 'AND' | 'OR' | 'NOT'
  | 'EQ' | 'NE' | 'LT' | 'LE' | 'GT' | 'GE'
  | 'NEG'
  | 'LABEL' | 'JUMP' | 'JUMP_IF_FALSE'
  | 'PARAM' | 'CALL' | 'RETURN'
  | 'PRINT';

export interface TACInstruction {
  op: TACOp;
  arg1?: string;
  arg2?: string;
  result?: string;
  line?: number;
}

export class TACGenerator {
  private instructions: TACInstruction[] = [];
  private tempCounter: number = 0;
  private labelCounter: number = 0;

  constructor() {}

  generate(program: Program): TACInstruction[] {
    this.instructions = [];
    this.tempCounter = 0;
    this.labelCounter = 0;

    for (const stmt of program.body) {
      this.generateStatement(stmt);
    }
    return this.instructions;
  }

  private nextTemp(): string {
    return `t${this.tempCounter++}`;
  }

  private nextLabel(): string {
    return `L${this.labelCounter++}`;
  }

  private emit(op: TACOp, arg1?: string, arg2?: string, result?: string, line?: number): void {
    this.instructions.push({ op, arg1, arg2, result, line });
  }

  private generateStatement(stmt: Statement): void {
    const line = stmt.line;
    switch (stmt.type) {
      case 'LetStatement': {
        if (stmt.init) {
          const val = this.generateExpression(stmt.init);
          this.emit('COPY', val, undefined, stmt.name, line);
        } else {
          // Initialize with default values if no initializer
          let defaultVal = '0';
          if (stmt.dataType === 'bool') defaultVal = 'false';
          if (stmt.dataType === 'string') defaultVal = '""';
          this.emit('COPY', defaultVal, undefined, stmt.name, line);
        }
        break;
      }
      case 'ConstStatement': {
        const val = this.generateExpression(stmt.init);
        this.emit('COPY', val, undefined, stmt.name, line);
        break;
      }
      case 'AssignStatement': {
        const val = this.generateExpression(stmt.value);
        this.emit('COPY', val, undefined, stmt.name, line);
        break;
      }
      case 'IfStatement': {
        const cond = this.generateExpression(stmt.condition);
        const elseLabel = this.nextLabel();
        const endLabel = this.nextLabel();

        this.emit('JUMP_IF_FALSE', cond, undefined, elseLabel, line);
        
        // Then block
        this.generateBlock(stmt.thenBranch);
        this.emit('JUMP', undefined, undefined, endLabel, line);

        // Else block
        this.emit('LABEL', undefined, undefined, elseLabel, line);
        if (stmt.elseBranch) {
          this.generateBlock(stmt.elseBranch);
        }
        this.emit('LABEL', undefined, undefined, endLabel, line);
        break;
      }
      case 'WhileStatement': {
        const startLabel = this.nextLabel();
        const endLabel = this.nextLabel();

        this.emit('LABEL', undefined, undefined, startLabel, line);
        const cond = this.generateExpression(stmt.condition);
        this.emit('JUMP_IF_FALSE', cond, undefined, endLabel, line);

        // Body
        this.generateBlock(stmt.body);
        this.emit('JUMP', undefined, undefined, startLabel, line);

        this.emit('LABEL', undefined, undefined, endLabel, line);
        break;
      }
      case 'ReturnStatement': {
        let val: string | undefined;
        if (stmt.value) {
          val = this.generateExpression(stmt.value);
        }
        this.emit('RETURN', val, undefined, undefined, line);
        break;
      }
      case 'FunctionDeclaration': {
        // Encase the function inside label and return to prevent fallthrough execution from code above
        const overLabel = this.nextLabel();
        this.emit('JUMP', undefined, undefined, overLabel, line);

        this.emit('LABEL', undefined, undefined, stmt.name, line);
        
        // Save parameters (the VM will read from the passed activation arguments)
        // In basic TAC, parameters are mapped directly as local names
        for (let i = 0; i < stmt.params.length; i++) {
          this.emit('COPY', `PARAM_${i}`, undefined, stmt.params[i].name, line);
        }

        // Generate body statements
        for (const s of stmt.body.body) {
          this.generateStatement(s);
        }

        // Implicit return
        this.emit('RETURN', undefined, undefined, undefined, line);

        this.emit('LABEL', undefined, undefined, overLabel, line);
        break;
      }
      case 'ExpressionStatement': {
        this.generateExpression(stmt.expression);
        break;
      }
      case 'BlockStatement': {
        this.generateBlock(stmt);
        break;
      }
    }
  }

  private generateBlock(block: BlockStatement): void {
    for (const stmt of block.body) {
      this.generateStatement(stmt);
    }
  }

  private generateExpression(expr: Expression): string {
    const line = expr.line;
    switch (expr.type) {
      case 'LiteralExpression':
        if (expr.valueType === 'string') {
          return `"${expr.value}"`;
        }
        return String(expr.value);

      case 'IdentifierExpression':
        return expr.name;

      case 'UnaryExpression': {
        const right = this.generateExpression(expr.right);
        const temp = this.nextTemp();
        const opMap: Record<string, TACOp> = {
          '-': 'NEG',
          '!': 'NOT',
        };
        this.emit(opMap[expr.op], right, undefined, temp, line);
        return temp;
      }

      case 'BinaryExpression': {
        const left = this.generateExpression(expr.left);
        const right = this.generateExpression(expr.right);
        const temp = this.nextTemp();
        const opMap: Record<string, TACOp> = {
          '+': 'ADD',
          '-': 'SUB',
          '*': 'MUL',
          '/': 'DIV',
          '%': 'MOD',
          '&&': 'AND',
          '||': 'OR',
          '==': 'EQ',
          '!=': 'NE',
          '<': 'LT',
          '<=': 'LE',
          '>': 'GT',
          '>=': 'GE',
        };
        this.emit(opMap[expr.op], left, right, temp, line);
        return temp;
      }

      case 'CallExpression': {
        // Evaluate args
        const argTemps: string[] = [];
        for (const arg of expr.args) {
          argTemps.push(this.generateExpression(arg));
        }

        // Check if print call
        if (expr.callee === 'print') {
          for (const temp of argTemps) {
            this.emit('PRINT', temp, undefined, undefined, line);
          }
          return '0'; // returns dummy code
        }

        // Normal function call
        for (const temp of argTemps) {
          this.emit('PARAM', temp, undefined, undefined, line);
        }
        const temp = this.nextTemp();
        this.emit('CALL', expr.callee, String(argTemps.length), temp, line);
        return temp;
      }
    }
  }
}
