export type ASTNode =
  | Program
  | Statement
  | Expression
  | Parameter;

export interface Program {
  type: 'Program';
  body: Statement[];
}

export type Statement =
  | LetStatement
  | ConstStatement
  | AssignStatement
  | IfStatement
  | WhileStatement
  | ReturnStatement
  | FunctionDeclaration
  | ExpressionStatement
  | BlockStatement;

export type DataType = 'int' | 'float' | 'bool' | 'string' | 'void';

export interface LetStatement {
  type: 'LetStatement';
  name: string;
  dataType: DataType;
  init?: Expression;
  line: number;
  column: number;
}

export interface ConstStatement {
  type: 'ConstStatement';
  name: string;
  dataType: DataType;
  init: Expression;
  line: number;
  column: number;
}

export interface AssignStatement {
  type: 'AssignStatement';
  name: string;
  value: Expression;
  line: number;
  column: number;
}

export interface IfStatement {
  type: 'IfStatement';
  condition: Expression;
  thenBranch: BlockStatement;
  elseBranch?: BlockStatement;
  line: number;
  column: number;
}

export interface WhileStatement {
  type: 'WhileStatement';
  condition: Expression;
  body: BlockStatement;
  line: number;
  column: number;
}

export interface ReturnStatement {
  type: 'ReturnStatement';
  value?: Expression;
  line: number;
  column: number;
}

export interface Parameter {
  type: 'Parameter';
  name: string;
  dataType: DataType;
  line: number;
  column: number;
}

export interface FunctionDeclaration {
  type: 'FunctionDeclaration';
  name: string;
  params: Parameter[];
  returnType: DataType;
  body: BlockStatement;
  line: number;
  column: number;
}

export interface ExpressionStatement {
  type: 'ExpressionStatement';
  expression: Expression;
  line: number;
  column: number;
}

export interface BlockStatement {
  type: 'BlockStatement';
  body: Statement[];
  line: number;
  column: number;
}

export type Expression =
  | BinaryExpression
  | UnaryExpression
  | LiteralExpression
  | IdentifierExpression
  | CallExpression;

export type BinaryOp =
  | '+' | '-' | '*' | '/' | '%'
  | '==' | '!=' | '<' | '<=' | '>' | '>='
  | '&&' | '||';

export interface BinaryExpression {
  type: 'BinaryExpression';
  left: Expression;
  op: BinaryOp;
  right: Expression;
  line: number;
  column: number;
}

export type UnaryOp = '-' | '!';

export interface UnaryExpression {
  type: 'UnaryExpression';
  op: UnaryOp;
  right: Expression;
  line: number;
  column: number;
}

export interface LiteralExpression {
  type: 'LiteralExpression';
  value: number | boolean | string;
  valueType: 'int' | 'float' | 'bool' | 'string';
  line: number;
  column: number;
}

export interface IdentifierExpression {
  type: 'IdentifierExpression';
  name: string;
  line: number;
  column: number;
}

export interface CallExpression {
  type: 'CallExpression';
  callee: string;
  args: Expression[];
  line: number;
  column: number;
}

// Utility to serialize the AST into a format suitable for visual display
export function serializeAST(node: ASTNode): any {
  if (!node) return null;

  switch (node.type) {
    case 'Program':
      return {
        name: 'Program',
        children: node.body.map(serializeAST),
      };
    case 'LetStatement':
      return {
        name: `let ${node.name}: ${node.dataType}`,
        children: node.init ? [serializeAST(node.init)] : [],
      };
    case 'ConstStatement':
      return {
        name: `const ${node.name}: ${node.dataType}`,
        children: [serializeAST(node.init)],
      };
    case 'AssignStatement':
      return {
        name: `${node.name} =`,
        children: [serializeAST(node.value)],
      };
    case 'IfStatement':
      const ifChildren = [serializeAST(node.condition), serializeAST(node.thenBranch)];
      if (node.elseBranch) {
        ifChildren.push(serializeAST(node.elseBranch));
      }
      return {
        name: 'if',
        children: ifChildren,
      };
    case 'WhileStatement':
      return {
        name: 'while',
        children: [serializeAST(node.condition), serializeAST(node.body)],
      };
    case 'ReturnStatement':
      return {
        name: 'return',
        children: node.value ? [serializeAST(node.value)] : [],
      };
    case 'Parameter':
      return {
        name: `${node.name}: ${node.dataType}`,
        children: [],
      };
    case 'FunctionDeclaration':
      return {
        name: `fn ${node.name}(...) -> ${node.returnType}`,
        children: [
          { name: 'Parameters', children: node.params.map(serializeAST) },
          serializeAST(node.body),
        ],
      };
    case 'ExpressionStatement':
      return serializeAST(node.expression);
    case 'BlockStatement':
      return {
        name: 'Block',
        children: node.body.map(serializeAST),
      };
    case 'BinaryExpression':
      return {
        name: `Binary Op (${node.op})`,
        children: [serializeAST(node.left), serializeAST(node.right)],
      };
    case 'UnaryExpression':
      return {
        name: `Unary Op (${node.op})`,
        children: [serializeAST(node.right)],
      };
    case 'LiteralExpression':
      return {
        name: `Literal (${node.valueType}): ${JSON.stringify(node.value)}`,
        children: [],
      };
    case 'IdentifierExpression':
      return {
        name: `Identifier: ${node.name}`,
        children: [],
      };
    case 'CallExpression':
      return {
        name: `Call: ${node.callee}()`,
        children: node.args.map(serializeAST),
      };
    default:
      return { name: 'Unknown Node', children: [] };
  }
}
