import { TACInstruction } from './tac.js';

export interface BasicBlock {
  id: string;
  label?: string; // If block starts with a label
  instructions: TACInstruction[];
  successors: string[]; // successor block IDs
}

export interface CFG {
  blocks: BasicBlock[];
  edges: { from: string; to: string; type: 'conditional_true' | 'conditional_false' | 'fallthrough' | 'unconditional' }[];
}

export class CFGBuilder {
  constructor() {}

  build(instructions: TACInstruction[]): CFG {
    if (instructions.length === 0) {
      return { blocks: [], edges: [] };
    }

    // 1. Identify leaders
    const isLeader = new Array(instructions.length).fill(false);
    isLeader[0] = true; // First instruction is leader

    // Map labels to their instruction indices
    const labelMap = new Map<string, number>();
    for (let i = 0; i < instructions.length; i++) {
      const inst = instructions[i];
      if (inst.op === 'LABEL' && inst.result) {
        labelMap.set(inst.result, i);
      }
    }

    for (let i = 0; i < instructions.length; i++) {
      const inst = instructions[i];
      if (inst.op === 'JUMP' || inst.op === 'JUMP_IF_FALSE' || inst.op === 'RETURN') {
        // Target is leader
        if (inst.op === 'JUMP' && inst.result) {
          const targetIdx = labelMap.get(inst.result);
          if (targetIdx !== undefined) isLeader[targetIdx] = true;
        }
        if (inst.op === 'JUMP_IF_FALSE' && inst.result) {
          const targetIdx = labelMap.get(inst.result);
          if (targetIdx !== undefined) isLeader[targetIdx] = true;
        }

        // Instruction immediately following is leader
        if (i + 1 < instructions.length) {
          isLeader[i + 1] = true;
        }
      }
    }

    // 2. Build Basic Blocks
    const blocks: BasicBlock[] = [];
    let currentBlockInsts: TACInstruction[] = [];
    let blockIdCounter = 0;
    const indexToBlockId = new Map<number, string>();
    let currentBlockLabel: string | undefined;

    for (let i = 0; i < instructions.length; i++) {
      if (isLeader[i] && currentBlockInsts.length > 0) {
        // Save current block
        const bId = `B${blockIdCounter++}`;
        blocks.push({
          id: bId,
          label: currentBlockLabel,
          instructions: currentBlockInsts,
          successors: [],
        });
        
        // Map all indices in the previous block to its ID
        for (let j = i - currentBlockInsts.length; j < i; j++) {
          indexToBlockId.set(j, bId);
        }
        
        currentBlockInsts = [];
        currentBlockLabel = undefined;
      }

      const inst = instructions[i];
      if (inst.op === 'LABEL') {
        currentBlockLabel = inst.result;
      }
      currentBlockInsts.push(inst);
    }

    // Save final block
    if (currentBlockInsts.length > 0) {
      const bId = `B${blockIdCounter++}`;
      blocks.push({
        id: bId,
        label: currentBlockLabel,
        instructions: currentBlockInsts,
        successors: [],
      });
      const startIdx = instructions.length - currentBlockInsts.length;
      for (let j = startIdx; j < instructions.length; j++) {
        indexToBlockId.set(j, bId);
      }
    }

    // 3. Connect Blocks (Add Successors & Edges)
    const edges: CFG['edges'] = [];

    // Map labels to block IDs
    const labelToBlockId = new Map<string, string>();
    for (const b of blocks) {
      if (b.label) {
        labelToBlockId.set(b.label, b.id);
      }
    }

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const lastInst = block.instructions[block.instructions.length - 1];
      const nextBlock = blocks[i + 1];



      if (lastInst.op === 'JUMP' && lastInst.result) {
        const targetBlockId = labelToBlockId.get(lastInst.result);
        if (targetBlockId) {
          block.successors.push(targetBlockId);
          edges.push({ from: block.id, to: targetBlockId, type: 'unconditional' });
        }
      } else if (lastInst.op === 'JUMP_IF_FALSE' && lastInst.result) {
        // True branch (conditional jump triggers if false, wait, JUMP_IF_FALSE means jump if condition is false)
        const falseBranchBlockId = labelToBlockId.get(lastInst.result);
        if (falseBranchBlockId) {
          block.successors.push(falseBranchBlockId);
          edges.push({ from: block.id, to: falseBranchBlockId, type: 'conditional_false' });
        }
        // Fallthrough branch (triggers if condition is true)
        if (nextBlock) {
          block.successors.push(nextBlock.id);
          edges.push({ from: block.id, to: nextBlock.id, type: 'conditional_true' });
        }
      } else if (lastInst.op === 'RETURN') {
        // Return has no successors, control flows back to caller
      } else {
        // Fallthrough
        if (nextBlock) {
          block.successors.push(nextBlock.id);
          edges.push({ from: block.id, to: nextBlock.id, type: 'fallthrough' });
        }
      }
    }

    return { blocks, edges };
  }
}
