export type ValueType = 'int' | 'boolean' | 'string'

export type BinaryOperator =
  | '+' | '-' | '*' | '/' | '%'
  | '<' | '>' | '<=' | '>='
  | '==' | '!='
  | '&&' | '||'

export type UnaryOperator = '!' | '-'

interface Position {
  line: number
  column: number
}

/**
 * Expression nodes. `valueType` (and `uniqueName` on identifiers) are filled in
 * by the semantic analyzer, which turns the parse result into an annotated AST.
 * For unary and binary nodes the position is that of the operator.
 */
export type Expression =
  | (Position & { type: 'literal'; value: number | boolean | string; valueType?: ValueType })
  | (Position & { type: 'identifier'; name: string; uniqueName?: string; valueType?: ValueType })
  | (Position & { type: 'unary'; operator: UnaryOperator; operand: Expression; valueType?: ValueType })
  | (Position & {
      type: 'binary'
      operator: BinaryOperator
      left: Expression
      right: Expression
      valueType?: ValueType
    })

export interface DeclarationStatement extends Position {
  type: 'declaration'
  /** `null` for `let`, whose type is inferred from the initializer. */
  declaredType: ValueType | null
  name: string
  value: Expression
  uniqueName?: string
}

export interface AssignmentStatement extends Position {
  type: 'assignment'
  name: string
  value: Expression
  uniqueName?: string
}

export interface PrintStatement extends Position {
  type: 'print'
  value: Expression
}

export interface BlockStatement extends Position {
  type: 'block'
  body: Statement[]
}

export interface IfStatement extends Position {
  type: 'if'
  condition: Expression
  thenBranch: BlockStatement
  elseBranch?: BlockStatement | IfStatement
}

export interface WhileStatement extends Position {
  type: 'while'
  condition: Expression
  body: BlockStatement
}

export type Statement =
  | DeclarationStatement
  | AssignmentStatement
  | PrintStatement
  | BlockStatement
  | IfStatement
  | WhileStatement

export interface Program {
  type: 'program'
  body: Statement[]
}
