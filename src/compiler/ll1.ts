export interface Production {
  lhs: string;
  rhs: string[]; // array of symbols, e.g. ['T', "E'"]
}

export interface Grammar {
  nonTerminals: string[];
  terminals: string[];
  startSymbol: string;
  productions: Production[];
}

// Classical LL(1) expression grammar, used to demonstrate parsing tables
export const SAMPLE_GRAMMAR: Grammar = {
  nonTerminals: ['E', 'Ep', 'T', 'Tp', 'F'],
  terminals: ['+', '*', '(', ')', 'id', 'num', '$'],
  startSymbol: 'E',
  productions: [
    { lhs: 'E', rhs: ['T', 'Ep'] },
    { lhs: 'Ep', rhs: ['+', 'T', 'Ep'] },
    { lhs: 'Ep', rhs: ['e'] }, // 'e' represents epsilon (empty string)
    { lhs: 'T', rhs: ['F', 'Tp'] },
    { lhs: 'Tp', rhs: ['*', 'F', 'Tp'] },
    { lhs: 'Tp', rhs: ['e'] },
    { lhs: 'F', rhs: ['(', 'E', ')'] },
    { lhs: 'F', rhs: ['id'] },
    { lhs: 'F', rhs: ['num'] },
  ],
};

export class LL1ParserTableGenerator {
  private grammar: Grammar;
  private firstSets: Map<string, Set<string>> = new Map();
  private followSets: Map<string, Set<string>> = new Map();
  private parseTable: Map<string, Map<string, Production>> = new Map();

  constructor(grammar: Grammar = SAMPLE_GRAMMAR) {
    this.grammar = grammar;
    this.generate();
  }

  getFirstSets(): Record<string, string[]> {
    const res: Record<string, string[]> = {};
    for (const [nt, set] of this.firstSets.entries()) {
      res[nt] = Array.from(set);
    }
    return res;
  }

  getFollowSets(): Record<string, string[]> {
    const res: Record<string, string[]> = {};
    for (const [nt, set] of this.followSets.entries()) {
      res[nt] = Array.from(set);
    }
    return res;
  }

  getTable(): Record<string, Record<string, string>> {
    const res: Record<string, Record<string, string>> = {};
    for (const nt of this.grammar.nonTerminals) {
      res[nt] = {};
      const row = this.parseTable.get(nt);
      for (const t of this.grammar.terminals) {
        if (t === 'e') continue;
        const prod = row?.get(t);
        res[nt][t] = prod ? `${prod.lhs} -> ${prod.rhs.join(' ')}` : '';
      }
    }
    return res;
  }

  private generate(): void {
    this.computeFirstSets();
    this.computeFollowSets();
    this.computeParseTable();
  }

  private isNonTerminal(symbol: string): boolean {
    return this.grammar.nonTerminals.includes(symbol);
  }

  private computeFirstSets(): void {
    // Initialize empty sets
    for (const nt of this.grammar.nonTerminals) {
      this.firstSets.set(nt, new Set());
    }

    let changed = true;
    while (changed) {
      changed = false;

      for (const prod of this.grammar.productions) {
        const lhs = prod.lhs;
        const rhs = prod.rhs;
        const lhsFirst = this.firstSets.get(lhs)!;
        const startSize = lhsFirst.size;

        if (rhs.length === 0 || rhs[0] === 'e') {
          // Rule: X -> epsilon
          lhsFirst.add('e');
        } else {
          // Rule: X -> Y1 Y2 ... Yk
          let allEpsilon = true;
          for (const symbol of rhs) {
            if (!this.isNonTerminal(symbol)) {
              // Terminal
              lhsFirst.add(symbol);
              allEpsilon = false;
              break;
            } else {
              // Non-terminal
              const symbolFirst = this.firstSets.get(symbol)!;
              for (const firstSym of symbolFirst) {
                if (firstSym !== 'e') {
                  lhsFirst.add(firstSym);
                }
              }
              if (!symbolFirst.has('e')) {
                allEpsilon = false;
                break;
              }
            }
          }
          if (allEpsilon) {
            lhsFirst.add('e');
          }
        }

        if (lhsFirst.size > startSize) {
          changed = true;
        }
      }
    }
  }

  private computeFollowSets(): void {
    // Initialize empty sets
    for (const nt of this.grammar.nonTerminals) {
      this.followSets.set(nt, new Set());
    }

    // Rule 1: Add $ to Follow of Start Symbol
    this.followSets.get(this.grammar.startSymbol)!.add('$');

    let changed = true;
    while (changed) {
      changed = false;

      for (const prod of this.grammar.productions) {
        const lhs = prod.lhs;
        const rhs = prod.rhs;

        for (let i = 0; i < rhs.length; i++) {
          const B = rhs[i];
          if (!this.isNonTerminal(B)) continue;

          const BFollow = this.followSets.get(B)!;
          const startSize = BFollow.size;

          // Rule 2: If A -> alpha B beta, then FIRST(beta) is in FOLLOW(B) (except epsilon)
          let allEpsilon = true;
          for (let j = i + 1; j < rhs.length; j++) {
            const symbol = rhs[j];
            if (!this.isNonTerminal(symbol)) {
              BFollow.add(symbol);
              allEpsilon = false;
              break;
            } else {
              const symbolFirst = this.firstSets.get(symbol)!;
              for (const firstSym of symbolFirst) {
                if (firstSym !== 'e') {
                  BFollow.add(firstSym);
                }
              }
              if (!symbolFirst.has('e')) {
                allEpsilon = false;
                break;
              }
            }
          }

          // Rule 3: If A -> alpha B, or A -> alpha B beta where FIRST(beta) contains epsilon, then FOLLOW(A) is in FOLLOW(B)
          if (allEpsilon) {
            const lhsFollow = this.followSets.get(lhs)!;
            for (const followSym of lhsFollow) {
              BFollow.add(followSym);
            }
          }

          if (BFollow.size > startSize) {
            changed = true;
          }
        }
      }
    }
  }

  private computeParseTable(): void {
    // Initialize the table
    for (const nt of this.grammar.nonTerminals) {
      this.parseTable.set(nt, new Map());
    }

    for (const prod of this.grammar.productions) {
      const lhs = prod.lhs;
      const rhs = prod.rhs;

      // Find FIRST(rhs)
      const firstRHS = new Set<string>();
      let allEpsilon = true;

      if (rhs.length === 0 || rhs[0] === 'e') {
        firstRHS.add('e');
      } else {
        for (const symbol of rhs) {
          if (!this.isNonTerminal(symbol)) {
            firstRHS.add(symbol);
            allEpsilon = false;
            break;
          } else {
            const symbolFirst = this.firstSets.get(symbol)!;
            for (const firstSym of symbolFirst) {
              if (firstSym !== 'e') {
                firstRHS.add(firstSym);
              }
            }
            if (!symbolFirst.has('e')) {
              allEpsilon = false;
              break;
            }
          }
        }
        if (allEpsilon) {
          firstRHS.add('e');
        }
      }

      // Rule 4: For each terminal 'a' in FIRST(rhs), add A -> rhs to M[A, a]
      const row = this.parseTable.get(lhs)!;
      for (const terminal of firstRHS) {
        if (terminal !== 'e') {
          row.set(terminal, prod);
        }
      }

      // Rule 5: If epsilon is in FIRST(rhs), for each terminal 'b' in FOLLOW(A), add A -> rhs to M[A, b]
      if (firstRHS.has('e')) {
        const lhsFollow = this.followSets.get(lhs)!;
        for (const terminal of lhsFollow) {
          row.set(terminal, prod);
        }
      }
    }
  }
}
