export type TokenType =
  // Keywords
  | 'LET' | 'CONST' | 'FN' | 'IF' | 'ELSE' | 'WHILE' | 'RETURN'
  | 'TYPE_INT' | 'TYPE_FLOAT' | 'TYPE_BOOL' | 'TYPE_STRING' | 'TYPE_VOID'
  | 'TRUE' | 'FALSE'
  // Literals
  | 'IDENTIFIER' | 'INT_LIT' | 'FLOAT_LIT' | 'STRING_LIT'
  // Operators
  | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH' | 'PERCENT'
  | 'EQ' | 'DOUBLE_EQ' | 'NOT_EQ' | 'LT' | 'LTE' | 'GT' | 'GTE'
  | 'AND' | 'OR' | 'NOT'
  // Punctuation
  | 'SEMICOLON' | 'COMMA' | 'COLON' | 'LPAREN' | 'RPAREN' | 'LBRACE' | 'RBRACE'
  | 'ARROW'
  // Special
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  index: number;
}

export interface CompilerError {
  type: 'LEXER' | 'PARSER' | 'SEMANTIC';
  message: string;
  line: number;
  column: number;
  length: number;
}

const KEYWORDS: Record<string, TokenType> = {
  let: 'LET',
  const: 'CONST',
  fn: 'FN',
  if: 'IF',
  else: 'ELSE',
  while: 'WHILE',
  return: 'RETURN',
  int: 'TYPE_INT',
  float: 'TYPE_FLOAT',
  bool: 'TYPE_BOOL',
  string: 'TYPE_STRING',
  void: 'TYPE_VOID',
  true: 'TRUE',
  false: 'FALSE',
};

export class Lexer {
  private source: string;
  private index: number = 0;
  private line: number = 1;
  private column: number = 1;
  private errors: CompilerError[] = [];

  constructor(source: string) {
    this.source = source;
  }

  getErrors(): CompilerError[] {
    return this.errors;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.index < this.source.length) {
      const char = this.source[this.index];

      // Newlines
      if (char === '\n') {
        this.index++;
        this.line++;
        this.column = 1;
        continue;
      }

      // Whitespace
      if (/\s/.test(char)) {
        this.index++;
        this.column++;
        continue;
      }

      // Comments (Line comments: // )
      if (char === '/' && this.source[this.index + 1] === '/') {
        this.index += 2;
        this.column += 2;
        while (this.index < this.source.length && this.source[this.index] !== '\n') {
          this.index++;
          this.column++;
        }
        continue;
      }

      // Arrow -> or Slash /
      if (char === '-') {
        if (this.source[this.index + 1] === '>') {
          tokens.push(this.createToken('ARROW', '->'));
          this.index += 2;
          this.column += 2;
          continue;
        }
      }

      // Double character operators: ==, !=, <=, >=, &&, ||
      if (char === '=') {
        if (this.source[this.index + 1] === '=') {
          tokens.push(this.createToken('DOUBLE_EQ', '=='));
          this.index += 2;
          this.column += 2;
          continue;
        } else {
          tokens.push(this.createToken('EQ', '='));
          this.index++;
          this.column++;
          continue;
        }
      }

      if (char === '!') {
        if (this.source[this.index + 1] === '=') {
          tokens.push(this.createToken('NOT_EQ', '!='));
          this.index += 2;
          this.column += 2;
          continue;
        } else {
          tokens.push(this.createToken('NOT', '!'));
          this.index++;
          this.column++;
          continue;
        }
      }

      if (char === '<') {
        if (this.source[this.index + 1] === '=') {
          tokens.push(this.createToken('LTE', '<='));
          this.index += 2;
          this.column += 2;
          continue;
        } else {
          tokens.push(this.createToken('LT', '<'));
          this.index++;
          this.column++;
          continue;
        }
      }

      if (char === '>') {
        if (this.source[this.index + 1] === '=') {
          tokens.push(this.createToken('GTE', '>='));
          this.index += 2;
          this.column += 2;
          continue;
        } else {
          tokens.push(this.createToken('GT', '>'));
          this.index++;
          this.column++;
          continue;
        }
      }

      if (char === '&' && this.source[this.index + 1] === '&') {
        tokens.push(this.createToken('AND', '&&'));
        this.index += 2;
        this.column += 2;
        continue;
      }

      if (char === '|' && this.source[this.index + 1] === '|') {
        tokens.push(this.createToken('OR', '||'));
        this.index += 2;
        this.column += 2;
        continue;
      }

      // Single character operators & punctuation
      if (char === '+') { tokens.push(this.createToken('PLUS', '+')); this.index++; this.column++; continue; }
      if (char === '-') { tokens.push(this.createToken('MINUS', '-')); this.index++; this.column++; continue; }
      if (char === '*') { tokens.push(this.createToken('STAR', '*')); this.index++; this.column++; continue; }
      if (char === '/') { tokens.push(this.createToken('SLASH', '/')); this.index++; this.column++; continue; }
      if (char === '%') { tokens.push(this.createToken('PERCENT', '%')); this.index++; this.column++; continue; }
      if (char === ';') { tokens.push(this.createToken('SEMICOLON', ';')); this.index++; this.column++; continue; }
      if (char === ',') { tokens.push(this.createToken('COMMA', ',')); this.index++; this.column++; continue; }
      if (char === ':') { tokens.push(this.createToken('COLON', ':')); this.index++; this.column++; continue; }
      if (char === '(') { tokens.push(this.createToken('LPAREN', '(')); this.index++; this.column++; continue; }
      if (char === ')') { tokens.push(this.createToken('RPAREN', ')')); this.index++; this.column++; continue; }
      if (char === '{') { tokens.push(this.createToken('LBRACE', '{')); this.index++; this.column++; continue; }
      if (char === '}') { tokens.push(this.createToken('RBRACE', '}')); this.index++; this.column++; continue; }

      // Strings (double quotes)
      if (char === '"') {
        const startLine = this.line;
        const startCol = this.column;
        const startIndex = this.index;
        let strVal = '';
        this.index++; // skip opening quote
        this.column++;

        let closed = false;
        while (this.index < this.source.length) {
          const c = this.source[this.index];
          if (c === '"') {
            closed = true;
            this.index++; // skip closing quote
            this.column++;
            break;
          }
          if (c === '\n') {
            this.line++;
            this.column = 1;
          }
          // Handle escapes
          if (c === '\\') {
            const next = this.source[this.index + 1];
            if (next === 'n') { strVal += '\n'; this.index += 2; this.column += 2; continue; }
            if (next === 't') { strVal += '\t'; this.index += 2; this.column += 2; continue; }
            if (next === '"') { strVal += '"'; this.index += 2; this.column += 2; continue; }
            if (next === '\\') { strVal += '\\'; this.index += 2; this.column += 2; continue; }
          }
          strVal += c;
          this.index++;
          this.column++;
        }

        if (!closed) {
          this.errors.push({
            type: 'LEXER',
            message: 'Unterminated string literal',
            line: startLine,
            column: startCol,
            length: this.index - startIndex,
          });
        }
        tokens.push({
          type: 'STRING_LIT',
          value: strVal,
          line: startLine,
          column: startCol,
          index: startIndex,
        });
        continue;
      }

      // Numbers (int & float)
      if (/[0-9]/.test(char)) {
        const startCol = this.column;
        const startIndex = this.index;
        let numStr = '';

        while (this.index < this.source.length && /[0-9]/.test(this.source[this.index])) {
          numStr += this.source[this.index];
          this.index++;
          this.column++;
        }

        // Float detection
        if (this.source[this.index] === '.' && /[0-9]/.test(this.source[this.index + 1])) {
          numStr += '.';
          this.index++; // skip '.'
          this.column++;
          while (this.index < this.source.length && /[0-9]/.test(this.source[this.index])) {
            numStr += this.source[this.index];
            this.index++;
            this.column++;
          }
          tokens.push({
            type: 'FLOAT_LIT',
            value: numStr,
            line: this.line,
            column: startCol,
            index: startIndex,
          });
        } else {
          tokens.push({
            type: 'INT_LIT',
            value: numStr,
            line: this.line,
            column: startCol,
            index: startIndex,
          });
        }
        continue;
      }

      // Identifiers & Keywords
      if (/[a-zA-Z_]/.test(char)) {
        const startCol = this.column;
        const startIndex = this.index;
        let idStr = '';

        while (
          this.index < this.source.length &&
          /[a-zA-Z0-9_]/.test(this.source[this.index])
        ) {
          idStr += this.source[this.index];
          this.index++;
          this.column++;
        }

        // Check if keyword
        const type = KEYWORDS[idStr] || 'IDENTIFIER';
        tokens.push({
          type,
          value: idStr,
          line: this.line,
          column: startCol,
          index: startIndex,
        });
        continue;
      }

      // Unknown character error
      this.errors.push({
        type: 'LEXER',
        message: `Illegal character '${char}'`,
        line: this.line,
        column: this.column,
        length: 1,
      });
      this.index++;
      this.column++;
    }

    tokens.push({
      type: 'EOF',
      value: '',
      line: this.line,
      column: this.column,
      index: this.index,
    });

    return tokens;
  }

  private createToken(type: TokenType, value: string): Token {
    return {
      type,
      value,
      line: this.line,
      column: this.column,
      index: this.index,
    };
  }
}
