import { TACInstruction } from './tac.js';

export interface OptimizationLog {
  pass: string;
  detail: string;
  line?: number;
}

export class TACOptimizer {
  private logs: OptimizationLog[] = [];

  constructor() {}

  getLogs(): OptimizationLog[] {
    return this.logs;
  }

  optimize(instructions: TACInstruction[]): TACInstruction[] {
    this.logs = [];
    let currentInstructions = [...instructions];
    let changed = true;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      // 1. Constant Folding Pass
      const foldRes = this.constantFolding(currentInstructions);
      if (foldRes.changed) {
        currentInstructions = foldRes.instructions;
        changed = true;
      }

      // 2. Copy Propagation Pass
      const propRes = this.copyPropagation(currentInstructions);
      if (propRes.changed) {
        currentInstructions = propRes.instructions;
        changed = true;
      }

      // 3. Dead Code Elimination Pass
      const dceRes = this.deadCodeElimination(currentInstructions);
      if (dceRes.changed) {
        currentInstructions = dceRes.instructions;
        changed = true;
      }

      // 4. Unreachable Code Elimination Pass
      const uceRes = this.unreachableCodeElimination(currentInstructions);
      if (uceRes.changed) {
        currentInstructions = uceRes.instructions;
        changed = true;
      }
    }

    return currentInstructions;
  }

  private isLiteral(val: string | undefined): boolean {
    if (!val) return false;
    // Check if number
    if (/^-?\d+(\.\d+)?$/.test(val)) return true;
    // Check if string literal
    if (val.startsWith('"') && val.endsWith('"')) return true;
    // Check if bool literal
    if (val === 'true' || val === 'false') return true;
    return false;
  }

  private parseLiteral(val: string): any {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (val.startsWith('"') && val.endsWith('"')) {
      return val.slice(1, -1);
    }
    return Number(val);
  }

  private formatLiteral(val: any): string {
    if (typeof val === 'string') {
      return `"${val}"`;
    }
    return String(val);
  }

  private constantFolding(instructions: TACInstruction[]): { instructions: TACInstruction[]; changed: boolean } {
    let changed = false;
    const result: TACInstruction[] = [];

    for (const inst of instructions) {
      if (inst.arg1 && inst.arg2 && this.isLiteral(inst.arg1) && this.isLiteral(inst.arg2)) {
        const v1 = this.parseLiteral(inst.arg1);
        const v2 = this.parseLiteral(inst.arg2);
        let foldedValue: any = null;
        let foldable = true;

        switch (inst.op) {
          case 'ADD':
            foldedValue = typeof v1 === 'string' || typeof v2 === 'string' ? String(v1) + String(v2) : v1 + v2;
            break;
          case 'SUB': foldedValue = v1 - v2; break;
          case 'MUL': foldedValue = v1 * v2; break;
          case 'DIV': foldedValue = v2 !== 0 ? v1 / v2 : 0; break;
          case 'MOD': foldedValue = v2 !== 0 ? v1 % v2 : 0; break;
          case 'AND': foldedValue = Boolean(v1 && v2); break;
          case 'OR': foldedValue = Boolean(v1 || v2); break;
          case 'EQ': foldedValue = v1 === v2; break;
          case 'NE': foldedValue = v1 !== v2; break;
          case 'LT': foldedValue = v1 < v2; break;
          case 'LE': foldedValue = v1 <= v2; break;
          case 'GT': foldedValue = v1 > v2; break;
          case 'GE': foldedValue = v1 >= v2; break;
          default:
            foldable = false;
        }

        if (foldable && foldedValue !== null && inst.result) {
          const literalStr = this.formatLiteral(foldedValue);
          this.logs.push({
            pass: 'Constant Folding',
            detail: `Folded operation '${inst.op} ${inst.arg1}, ${inst.arg2}' into constant copy of '${literalStr}' to '${inst.result}'`,
            line: inst.line,
          });
          result.push({
            op: 'COPY',
            arg1: literalStr,
            result: inst.result,
            line: inst.line,
          });
          changed = true;
          continue;
        }
      }

      // Unary folding
      if (inst.arg1 && !inst.arg2 && this.isLiteral(inst.arg1)) {
        const v = this.parseLiteral(inst.arg1);
        let foldedValue: any = null;
        let foldable = true;

        switch (inst.op) {
          case 'NEG': foldedValue = -v; break;
          case 'NOT': foldedValue = !v; break;
          default: foldable = false;
        }

        if (foldable && foldedValue !== null && inst.result) {
          const literalStr = this.formatLiteral(foldedValue);
          this.logs.push({
            pass: 'Constant Folding',
            detail: `Folded unary operation '${inst.op} ${inst.arg1}' into constant '${literalStr}'`,
            line: inst.line,
          });
          result.push({
            op: 'COPY',
            arg1: literalStr,
            result: inst.result,
            line: inst.line,
          });
          changed = true;
          continue;
        }
      }

      result.push(inst);
    }

    return { instructions: result, changed };
  }

  private copyPropagation(instructions: TACInstruction[]): { instructions: TACInstruction[]; changed: boolean } {
    let changed = false;
    const result: TACInstruction[] = [];
    // Map variable names to their current replacement (variable or literal)
    const copyMap = new Map<string, string>();

    for (const inst of instructions) {
      let arg1 = inst.arg1;
      let arg2 = inst.arg2;


      // Propagate arg1
      if (arg1 && copyMap.has(arg1)) {
        const replacement = copyMap.get(arg1)!;
        this.logs.push({
          pass: 'Copy Propagation',
          detail: `Propagated value for '${arg1}' -> replaced with '${replacement}' in instruction`,
          line: inst.line,
        });
        arg1 = replacement;
        changed = true;
      }

      // Propagate arg2
      if (arg2 && copyMap.has(arg2)) {
        const replacement = copyMap.get(arg2)!;
        this.logs.push({
          pass: 'Copy Propagation',
          detail: `Propagated value for '${arg2}' -> replaced with '${replacement}' in instruction`,
          line: inst.line,
        });
        arg2 = replacement;
        changed = true;
      }

      const updatedInst = {
        ...inst,
        arg1,
        arg2,
      };

      // Manage copy bindings
      if (updatedInst.op === 'COPY' && updatedInst.result) {
        // If assigning a literal or another variable, create mapping
        if (updatedInst.arg1) {
          copyMap.set(updatedInst.result, updatedInst.arg1);
        }
      } else if (updatedInst.result) {
        // If variable is written to by another operation, invalidate its copy mapping
        copyMap.delete(updatedInst.result);
      }

      // If a source variable of copy mappings is rewritten, we invalidate the mapping
      if (updatedInst.result) {
        for (const [key, val] of copyMap.entries()) {
          if (val === updatedInst.result) {
            copyMap.delete(key);
          }
        }
      }

      result.push(updatedInst);
    }

    return { instructions: result, changed };
  }

  private deadCodeElimination(instructions: TACInstruction[]): { instructions: TACInstruction[]; changed: boolean } {
    let changed = false;
    const result: TACInstruction[] = [];
    const readCounts = new Map<string, number>();

    // Count reads of all variables
    for (const inst of instructions) {
      if (inst.arg1 && !this.isLiteral(inst.arg1)) {
        readCounts.set(inst.arg1, (readCounts.get(inst.arg1) || 0) + 1);
      }
      if (inst.arg2 && !this.isLiteral(inst.arg2)) {
        readCounts.set(inst.arg2, (readCounts.get(inst.arg2) || 0) + 1);
      }
    }

    for (const inst of instructions) {
      // We can eliminate assignments to temporary variables (t0, t1, t2...) if they are never read.
      // Do not eliminate assignments to user variables as they represent program state, unless copy-propagated and proven dead.
      // Also, CALL instructions have side effects, do not eliminate them!
      if (
        inst.result &&
        inst.result.startsWith('t') && // is a temporary variable
        (readCounts.get(inst.result) || 0) === 0 &&
        inst.op !== 'CALL' &&
        inst.op !== 'PRINT'
      ) {
        this.logs.push({
          pass: 'Dead Code Elimination',
          detail: `Removed dead temporary write to unused variable '${inst.result}'`,
          line: inst.line,
        });
        changed = true;
        continue;
      }
      result.push(inst);
    }

    return { instructions: result, changed };
  }

  private unreachableCodeElimination(instructions: TACInstruction[]): { instructions: TACInstruction[]; changed: boolean } {
    let changed = false;
    const result: TACInstruction[] = [];
    let unreachable = false;

    for (const inst of instructions) {
      if (inst.op === 'LABEL') {
        // Labels reset unreachable status because jumps targeting this label might bypass previous return/jumps
        unreachable = false;
      }

      if (unreachable) {
        // Eliminate instructions until we hit a label
        this.logs.push({
          pass: 'Unreachable Code Elimination',
          detail: `Removed unreachable instruction '${inst.op}' after control flow break`,
          line: inst.line,
        });
        changed = true;
        continue;
      }

      result.push(inst);

      // Unconditional control flow break
      if (inst.op === 'RETURN' || inst.op === 'JUMP') {
        unreachable = true;
      }
    }

    return { instructions: result, changed };
  }
}
