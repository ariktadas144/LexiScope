import { evalBinary, evalUnary } from '../semantics'
import type { BlockStatement, Expression, IfStatement, Program, Statement } from '../parser/ast'

const literalOf = (value: number | boolean | string, at: Expression): Expression => ({
  type: 'literal',
  value,
  line: at.line,
  column: at.column,
  valueType: typeof value === 'number' ? 'int' : typeof value === 'boolean' ? 'boolean' : 'string',
})

/**
 * Folds constant sub-expressions bottom-up and returns a new expression.
 * Folding uses the interpreter's own operator semantics, and an operation that
 * would fail at run time (division by zero, overflow) is left in place so the
 * error is still reported when the program runs.
 */
export function foldExpression(expression: Expression): Expression {
  switch (expression.type) {
    case 'literal':
    case 'identifier':
      return { ...expression }
    case 'unary': {
      const operand = foldExpression(expression.operand)
      if (operand.type === 'literal') {
        const result = evalUnary(expression.operator, operand.value)
        if (result.ok) return literalOf(result.value, expression)
      }
      return { ...expression, operand }
    }
    case 'binary': {
      const left = foldExpression(expression.left)
      const right = foldExpression(expression.right)
      // Short-circuit identities: the left literal alone decides the result.
      if (expression.operator === '&&' && left.type === 'literal') {
        return left.value === false ? literalOf(false, expression) : right
      }
      if (expression.operator === '||' && left.type === 'literal') {
        return left.value === true ? literalOf(true, expression) : right
      }
      if (left.type === 'literal' && right.type === 'literal') {
        const result = evalBinary(expression.operator, left.value, right.value)
        if (result.ok) return literalOf(result.value, expression)
      }
      return { ...expression, left, right }
    }
  }
}

const foldBlock = (block: BlockStatement): BlockStatement => ({ ...block, body: block.body.map(foldStatement) })

const foldIf = (statement: IfStatement): IfStatement => {
  const folded: IfStatement = {
    ...statement,
    condition: foldExpression(statement.condition),
    thenBranch: foldBlock(statement.thenBranch),
  }
  if (statement.elseBranch) {
    folded.elseBranch = statement.elseBranch.type === 'if' ? foldIf(statement.elseBranch) : foldBlock(statement.elseBranch)
  }
  return folded
}

function foldStatement(statement: Statement): Statement {
  switch (statement.type) {
    case 'declaration':
    case 'assignment':
    case 'print':
      return { ...statement, value: foldExpression(statement.value) }
    case 'block':
      return foldBlock(statement)
    case 'if':
      return foldIf(statement)
    case 'while':
      return { ...statement, condition: foldExpression(statement.condition), body: foldBlock(statement.body) }
  }
}

/** Returns a folded copy of the program; the original AST is not modified. */
export function foldProgram(program: Program): Program {
  return { ...program, body: program.body.map(foldStatement) }
}
