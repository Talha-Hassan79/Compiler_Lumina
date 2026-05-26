import { Token, TokenType, CompilerError } from './lexer.js';
import {
  Program,
  Statement,
  Expression,
  Parameter,
  BlockStatement,
  LetStatement,
  ConstStatement,
  IfStatement,
  WhileStatement,
  ReturnStatement,
  FunctionDeclaration,
  DataType,
  BinaryOp,
  UnaryOp,
} from './ast.js';

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private errors: CompilerError[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  getErrors(): CompilerError[] {
    return this.errors;
  }

  parse(): Program {
    const statements: Statement[] = [];
    while (!this.isAtEnd()) {
      try {
        const stmt = this.declaration();
        if (stmt) {
          statements.push(stmt);
        }
      } catch (e) {
        this.synchronize();
      }
    }
    return {
      type: 'Program',
      body: statements,
    };
  }

  private declaration(): Statement | null {
    if (this.match('FN')) {
      return this.functionDeclaration();
    }
    return this.statement();
  }

  private functionDeclaration(): FunctionDeclaration {
    const startToken = this.previous();
    const name = this.consume('IDENTIFIER', 'Expect function name.').value;
    
    this.consume('LPAREN', "Expect '(' after function name.");
    const params: Parameter[] = [];
    if (!this.check('RPAREN')) {
      do {
        const pName = this.consume('IDENTIFIER', 'Expect parameter name.').value;
        this.consume('COLON', "Expect ':' after parameter name.");
        const pType = this.parseType();
        params.push({
          type: 'Parameter',
          name: pName,
          dataType: pType,
          line: this.previous().line,
          column: this.previous().column,
        });
      } while (this.match('COMMA'));
    }
    this.consume('RPAREN', "Expect ')' after parameters.");

    let returnType: DataType = 'void';
    if (this.match('ARROW')) {
      returnType = this.parseType();
    }

    this.consume('LBRACE', "Expect '{' before function body.");
    const body = this.blockStatement();

    return {
      type: 'FunctionDeclaration',
      name,
      params,
      returnType,
      body,
      line: startToken.line,
      column: startToken.column,
    };
  }

  private statement(): Statement {
    if (this.match('LET')) return this.letStatement();
    if (this.match('CONST')) return this.constStatement();
    if (this.match('IF')) return this.ifStatement();
    if (this.match('WHILE')) return this.whileStatement();
    if (this.match('RETURN')) return this.returnStatement();
    if (this.match('LBRACE')) return this.blockStatement();
    return this.expressionStatementOrAssignment();
  }

  private letStatement(): LetStatement {
    const startToken = this.previous();
    const name = this.consume('IDENTIFIER', 'Expect variable name.').value;
    
    this.consume('COLON', "Expect ':' type declaration.");
    const dataType = this.parseType();

    let init: Expression | undefined;
    if (this.match('EQ')) {
      init = this.expression();
    }

    this.consume('SEMICOLON', "Expect ';' after variable declaration.");
    return {
      type: 'LetStatement',
      name,
      dataType,
      init,
      line: startToken.line,
      column: startToken.column,
    };
  }

  private constStatement(): ConstStatement {
    const startToken = this.previous();
    const name = this.consume('IDENTIFIER', 'Expect variable name.').value;
    
    this.consume('COLON', "Expect ':' type declaration.");
    const dataType = this.parseType();

    this.consume('EQ', "Expect '=' initialization for constant declaration.");
    const init = this.expression();

    this.consume('SEMICOLON', "Expect ';' after constant declaration.");
    return {
      type: 'ConstStatement',
      name,
      dataType,
      init,
      line: startToken.line,
      column: startToken.column,
    };
  }

  private ifStatement(): IfStatement {
    const startToken = this.previous();
    this.consume('LPAREN', "Expect '(' after 'if'.");
    const condition = this.expression();
    this.consume('RPAREN', "Expect ')' after condition.");

    this.consume('LBRACE', "Expect '{' to start the 'then' block.");
    const thenBranch = this.blockStatement();

    let elseBranch: BlockStatement | undefined;
    if (this.match('ELSE')) {
      this.consume('LBRACE', "Expect '{' to start the 'else' block.");
      elseBranch = this.blockStatement();
    }

    return {
      type: 'IfStatement',
      condition,
      thenBranch,
      elseBranch,
      line: startToken.line,
      column: startToken.column,
    };
  }

  private whileStatement(): WhileStatement {
    const startToken = this.previous();
    this.consume('LPAREN', "Expect '(' after 'while'.");
    const condition = this.expression();
    this.consume('RPAREN', "Expect ')' after condition.");

    this.consume('LBRACE', "Expect '{' to start the loop body.");
    const body = this.blockStatement();

    return {
      type: 'WhileStatement',
      condition,
      body,
      line: startToken.line,
      column: startToken.column,
    };
  }

  private returnStatement(): ReturnStatement {
    const startToken = this.previous();
    let value: Expression | undefined;
    if (!this.check('SEMICOLON')) {
      value = this.expression();
    }
    this.consume('SEMICOLON', "Expect ';' after return statement.");
    return {
      type: 'ReturnStatement',
      value,
      line: startToken.line,
      column: startToken.column,
    };
  }

  private blockStatement(): BlockStatement {
    const startToken = this.previous();
    const body: Statement[] = [];
    
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      try {
        const stmt = this.declaration();
        if (stmt) body.push(stmt);
      } catch (e) {
        this.synchronize();
      }
    }

    this.consume('RBRACE', "Expect '}' after block.");
    return {
      type: 'BlockStatement',
      body,
      line: startToken.line,
      column: startToken.column,
    };
  }

  private expressionStatementOrAssignment(): Statement {
    const startToken = this.peek();
    
    // We try to parse an expression
    const expr = this.expression();

    // If it's an Identifier followed by an '=' then it is an Assignment Statement
    if (expr.type === 'IdentifierExpression' && this.match('EQ')) {
      const value = this.expression();
      this.consume('SEMICOLON', "Expect ';' after assignment.");
      return {
        type: 'AssignStatement',
        name: expr.name,
        value,
        line: startToken.line,
        column: startToken.column,
      };
    }

    // Otherwise, it is an Expression Statement
    this.consume('SEMICOLON', "Expect ';' after expression.");
    return {
      type: 'ExpressionStatement',
      expression: expr,
      line: startToken.line,
      column: startToken.column,
    };
  }

  private expression(): Expression {
    return this.logicalOr();
  }

  private logicalOr(): Expression {
    let expr = this.logicalAnd();
    while (this.match('OR')) {
      const op = this.previous().value as BinaryOp;
      const right = this.logicalAnd();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        op,
        right,
        line: expr.line,
        column: expr.column,
      };
    }
    return expr;
  }

  private logicalAnd(): Expression {
    let expr = this.equality();
    while (this.match('AND')) {
      const op = this.previous().value as BinaryOp;
      const right = this.equality();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        op,
        right,
        line: expr.line,
        column: expr.column,
      };
    }
    return expr;
  }

  private equality(): Expression {
    let expr = this.comparison();
    while (this.match('DOUBLE_EQ', 'NOT_EQ')) {
      const op = this.previous().value as BinaryOp;
      const right = this.comparison();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        op,
        right,
        line: expr.line,
        column: expr.column,
      };
    }
    return expr;
  }

  private comparison(): Expression {
    let expr = this.term();
    while (this.match('LT', 'LTE', 'GT', 'GTE')) {
      const op = this.previous().value as BinaryOp;
      const right = this.term();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        op,
        right,
        line: expr.line,
        column: expr.column,
      };
    }
    return expr;
  }

  private term(): Expression {
    let expr = this.factor();
    while (this.match('PLUS', 'MINUS')) {
      const op = this.previous().value as BinaryOp;
      const right = this.factor();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        op,
        right,
        line: expr.line,
        column: expr.column,
      };
    }
    return expr;
  }

  private factor(): Expression {
    let expr = this.unary();
    while (this.match('STAR', 'SLASH', 'PERCENT')) {
      const op = this.previous().value as BinaryOp;
      const right = this.unary();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        op,
        right,
        line: expr.line,
        column: expr.column,
      };
    }
    return expr;
  }

  private unary(): Expression {
    if (this.match('NOT', 'MINUS')) {
      const op = this.previous().value as UnaryOp;
      const right = this.unary();
      return {
        type: 'UnaryExpression',
        op,
        right,
        line: this.previous().line,
        column: this.previous().column,
      };
    }
    return this.primary();
  }

  private primary(): Expression {
    if (this.match('TRUE')) {
      return {
        type: 'LiteralExpression',
        value: true,
        valueType: 'bool',
        line: this.previous().line,
        column: this.previous().column,
      };
    }
    if (this.match('FALSE')) {
      return {
        type: 'LiteralExpression',
        value: false,
        valueType: 'bool',
        line: this.previous().line,
        column: this.previous().column,
      };
    }
    if (this.match('INT_LIT')) {
      return {
        type: 'LiteralExpression',
        value: parseInt(this.previous().value, 10),
        valueType: 'int',
        line: this.previous().line,
        column: this.previous().column,
      };
    }
    if (this.match('FLOAT_LIT')) {
      return {
        type: 'LiteralExpression',
        value: parseFloat(this.previous().value),
        valueType: 'float',
        line: this.previous().line,
        column: this.previous().column,
      };
    }
    if (this.match('STRING_LIT')) {
      return {
        type: 'LiteralExpression',
        value: this.previous().value,
        valueType: 'string',
        line: this.previous().line,
        column: this.previous().column,
      };
    }

    if (this.match('IDENTIFIER')) {
      const nameToken = this.previous();
      // Handle function call (e.g. print(x))
      if (this.match('LPAREN')) {
        const args: Expression[] = [];
        if (!this.check('RPAREN')) {
          do {
            args.push(this.expression());
          } while (this.match('COMMA'));
        }
        this.consume('RPAREN', "Expect ')' after arguments.");
        return {
          type: 'CallExpression',
          callee: nameToken.value,
          args,
          line: nameToken.line,
          column: nameToken.column,
        };
      }
      return {
        type: 'IdentifierExpression',
        name: nameToken.value,
        line: nameToken.line,
        column: nameToken.column,
      };
    }

    if (this.match('LPAREN')) {
      const expr = this.expression();
      this.consume('RPAREN', "Expect ')' after expression.");
      return expr;
    }

    throw this.error(this.peek(), 'Expect expression.');
  }

  private parseType(): DataType {
    if (this.match('TYPE_INT')) return 'int';
    if (this.match('TYPE_FLOAT')) return 'float';
    if (this.match('TYPE_BOOL')) return 'bool';
    if (this.match('TYPE_STRING')) return 'string';
    if (this.match('TYPE_VOID')) return 'void';
    
    throw this.error(this.peek(), 'Expect variable or return type (int, float, bool, string, void).');
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(this.peek(), message);
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return type === 'EOF';
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF' || this.current >= this.tokens.length;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private error(token: Token, message: string): Error {
    const compilerErr: CompilerError = {
      type: 'PARSER',
      message: `${message} (Found '${token.value || token.type}')`,
      line: token.line,
      column: token.column,
      length: token.value.length || 1,
    };
    this.errors.push(compilerErr);
    return new Error(message);
  }

  private synchronize(): void {
    if (!this.isAtEnd()) {
      switch (this.peek().type) {
        case 'LET':
        case 'CONST':
        case 'FN':
        case 'IF':
        case 'WHILE':
        case 'RETURN':
          return;
      }
    }

    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === 'SEMICOLON') return;

      switch (this.peek().type) {
        case 'LET':
        case 'CONST':
        case 'FN':
        case 'IF':
        case 'WHILE':
        case 'RETURN':
          return;
      }

      this.advance();
    }
  }
}
