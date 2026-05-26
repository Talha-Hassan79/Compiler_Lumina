import { TACInstruction } from './tac.js';

export interface Frame {
  fnName: string;
  returnAddress: number;
  locals: Record<string, any>;
  resultTemp?: string; // Where to store return value in caller
}

export interface VMState {
  ip: number;
  globals: Record<string, any>;
  stack: Frame[];
  console: string[];
  isFinished: boolean;
  stepsCount: number;
}

export class TACVirtualMachine {
  private instructions: TACInstruction[] = [];
  private labelMap: Map<string, number> = new Map();
  private state: VMState;
  
  // Arguments passed to parameters of next function call
  private argQueue: any[] = [];

  constructor(instructions: TACInstruction[]) {
    this.instructions = instructions;
    this.state = {
      ip: 0,
      globals: {},
      stack: [],
      console: [],
      isFinished: false,
      stepsCount: 0,
    };
    this.argQueue = [];
    this.preprocessLabels();
  }

  getState(): VMState {
    return {
      ...this.state,
      globals: { ...this.state.globals },
      stack: this.state.stack.map(f => ({ ...f, locals: { ...f.locals } })),
      console: [...this.state.console],
    };
  }

  private preprocessLabels(): void {
    for (let i = 0; i < this.instructions.length; i++) {
      const inst = this.instructions[i];
      if (inst.op === 'LABEL' && inst.result) {
        this.labelMap.set(inst.result, i);
      }
    }
  }

  private resolveValue(val: string | undefined): any {
    if (val === undefined) return undefined;
    
    // Check if literal
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (val.startsWith('"') && val.endsWith('"')) {
      return val.slice(1, -1);
    }
    if (/^-?\d+(\.\d+)?$/.test(val)) {
      return Number(val);
    }

    // Resolve as variable
    const currentFrame = this.getCurrentFrame();
    if (currentFrame && currentFrame.locals[val] !== undefined) {
      return currentFrame.locals[val];
    }
    
    // Fallback to global
    if (this.state.globals[val] !== undefined) {
      return this.state.globals[val];
    }

    return undefined; // Default unitialized
  }

  private getCurrentFrame(): Frame | null {
    if (this.state.stack.length === 0) return null;
    return this.state.stack[this.state.stack.length - 1];
  }

  private setVariable(name: string, value: any): void {
    const currentFrame = this.getCurrentFrame();
    if (currentFrame) {
      currentFrame.locals[name] = value;
    } else {
      this.state.globals[name] = value;
    }
  }

  step(): VMState {
    if (this.state.isFinished || this.state.ip >= this.instructions.length) {
      this.state.isFinished = true;
      return this.getState();
    }

    const inst = this.instructions[this.state.ip];
    this.state.stepsCount++;

    const op = inst.op;
    const arg1Val = this.resolveValue(inst.arg1);
    const arg2Val = this.resolveValue(inst.arg2);

    let nextIp = this.state.ip + 1;

    switch (op) {
      case 'ADD': {
        const res = typeof arg1Val === 'string' || typeof arg2Val === 'string'
          ? String(arg1Val) + String(arg2Val)
          : arg1Val + arg2Val;
        if (inst.result) this.setVariable(inst.result, res);
        break;
      }
      case 'SUB': {
        if (inst.result) this.setVariable(inst.result, arg1Val - arg2Val);
        break;
      }
      case 'MUL': {
        if (inst.result) this.setVariable(inst.result, arg1Val * arg2Val);
        break;
      }
      case 'DIV': {
        if (inst.result) this.setVariable(inst.result, arg2Val !== 0 ? arg1Val / arg2Val : 0);
        break;
      }
      case 'MOD': {
        if (inst.result) this.setVariable(inst.result, arg2Val !== 0 ? arg1Val % arg2Val : 0);
        break;
      }
      case 'AND': {
        if (inst.result) this.setVariable(inst.result, Boolean(arg1Val && arg2Val));
        break;
      }
      case 'OR': {
        if (inst.result) this.setVariable(inst.result, Boolean(arg1Val || arg2Val));
        break;
      }
      case 'EQ': {
        if (inst.result) this.setVariable(inst.result, arg1Val === arg2Val);
        break;
      }
      case 'NE': {
        if (inst.result) this.setVariable(inst.result, arg1Val !== arg2Val);
        break;
      }
      case 'LT': {
        if (inst.result) this.setVariable(inst.result, arg1Val < arg2Val);
        break;
      }
      case 'LE': {
        if (inst.result) this.setVariable(inst.result, arg1Val <= arg2Val);
        break;
      }
      case 'GT': {
        if (inst.result) this.setVariable(inst.result, arg1Val > arg2Val);
        break;
      }
      case 'GE': {
        if (inst.result) this.setVariable(inst.result, arg1Val >= arg2Val);
        break;
      }
      case 'NEG': {
        if (inst.result) this.setVariable(inst.result, -arg1Val);
        break;
      }
      case 'NOT': {
        if (inst.result) this.setVariable(inst.result, !arg1Val);
        break;
      }
      case 'COPY': {
        if (inst.result) {
          // If coping variable or literal, resolve it
          let resolved = arg1Val;
          // Check for parameter mappings from previous frame frame setup
          if (inst.arg1?.startsWith('PARAM_')) {
            const currentFrame = this.getCurrentFrame();
            if (currentFrame && currentFrame.locals[inst.arg1] !== undefined) {
              resolved = currentFrame.locals[inst.arg1];
            }
          }
          this.setVariable(inst.result, resolved);
        }
        break;
      }
      case 'LABEL': {
        // LABEL is a target, no execution effects
        break;
      }
      case 'JUMP': {
        if (inst.result) {
          const targetIp = this.labelMap.get(inst.result);
          if (targetIp !== undefined) {
            nextIp = targetIp + 1;
          }
        }
        break;
      }
      case 'JUMP_IF_FALSE': {
        if (inst.result) {
          // Check if condition is false
          if (!arg1Val) {
            const targetIp = this.labelMap.get(inst.result);
            if (targetIp !== undefined) {
              nextIp = targetIp + 1;
            }
          }
        }
        break;
      }
      case 'PARAM': {
        this.argQueue.push(arg1Val);
        break;
      }
      case 'CALL': {
        if (inst.arg1 && inst.result) {
          const fnName = inst.arg1;
          const argCount = parseInt(inst.arg2 || '0', 10);
          
          const fnIp = this.labelMap.get(fnName);
          if (fnIp !== undefined) {
            const poppedArgs = this.argQueue.splice(this.argQueue.length - argCount, argCount);
            
            const newFrameLocals: Record<string, any> = {};
            for (let i = 0; i < poppedArgs.length; i++) {
              newFrameLocals[`PARAM_${i}`] = poppedArgs[i];
            }

            this.state.stack.push({
              fnName,
              returnAddress: this.state.ip + 1,
              locals: newFrameLocals,
              resultTemp: inst.result,
            });

            nextIp = fnIp + 1;
          }
        }
        break;
      }
      case 'RETURN': {
        const frame = this.state.stack.pop();
        if (frame) {
          nextIp = frame.returnAddress;
          // Store return value in caller
          if (frame.resultTemp && arg1Val !== undefined) {
            this.setVariable(frame.resultTemp, arg1Val);
          }
        } else {
          // Main program returned, finish VM
          nextIp = this.instructions.length;
        }
        break;
      }
      case 'PRINT': {
        this.state.console.push(String(arg1Val));
        break;
      }
    }

    this.state.ip = nextIp;
    if (this.state.ip >= this.instructions.length) {
      this.state.isFinished = true;
    }

    return this.getState();
  }

  run(maxSteps: number = 10000): VMState {
    while (!this.state.isFinished && this.state.stepsCount < maxSteps) {
      this.step();
    }
    if (this.state.stepsCount >= maxSteps) {
      this.state.console.push(`[VM ERROR]: Exceeded maximum steps execution limit of ${maxSteps}. Infinite loop suspected.`);
      this.state.isFinished = true;
    }
    return this.getState();
  }
}
