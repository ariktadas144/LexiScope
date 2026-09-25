import { CompilerError } from '../errors/CompilerError'
import type { BinaryOperator, Expression, Program, Statement, ValueType } from '../parser/ast'
import { SymbolTable } from './symbolTable'

const arithmetic = new Set<BinaryOperator>(['+', '-', '*', '/', '%'])
const ordering = new Set<BinaryOperator>(['<', '>', '<=', '>='])
const equality = new Set<BinaryOperator>(['==', '!='])

const semanticError = (message: string, node: { line: number; column: number }) =>
  new CompilerError('semantic', message, node.line, node.column)

/**
 * Semantic analysis: declaration checking, scope resolution and type checking.
 * The AST is annotated in place (`valueType` on expressions, `uniqueName` on
 * identifiers and declarations). Pass in a table to keep the symbols found so
 * far when an error is thrown.
 */
export function analyze(program: Program, table: SymbolTable = new SymbolTable()): SymbolTable {
  const checkExpression = (expression: Expression): ValueType => {
    let type: ValueType
    switch (expression.type) {
      case 'literal':
        type = typeof expression.value === 'number' ? 'int' : typeof expression.value === 'boolean' ? 'boolean' : 'string'
        break
      case 'identifier': {
        const entry = table.lookup(expression.name)
        if (!entry) throw semanticError(`Unknown identifier '${expression.name}' (not declared in this scope)`, expression)
        expression.uniqueName = entry.uniqueName
        type = entry.type
        break
      }
      case 'unary': {
        const operand = checkExpression(expression.operand)
        const expected: ValueType = expression.operator === '!' ? 'boolean' : 'int'
        if (operand !== expected) {
          const article = expected === 'int' ? 'an' : 'a'
          throw semanticError(`Operator '${expression.operator}' expects ${article} ${expected} operand but found ${operand}`, expression)
        }
        type = expected
        break
      }
      case 'binary': {
        const left = checkExpression(expression.left)
        const right = checkExpression(expression.right)
        const operator = expression.operator
        if (arithmetic.has(operator) || ordering.has(operator)) {
          if (left !== 'int' || right !== 'int') {
            throw semanticError(`Operator '${operator}' expects int operands but found ${left} and ${right}`, expression)
          }
          type = arithmetic.has(operator) ? 'int' : 'boolean'
        } else if (equality.has(operator)) {
          if (left !== right) {
            throw semanticError(`Operator '${operator}' cannot compare ${left} with ${right}`, expression)
          }
          type = 'boolean'
        } else {
          if (left !== 'boolean' || right !== 'boolean') {
            throw semanticError(`Operator '${operator}' expects boolean operands but found ${left} and ${right}`, expression)
          }
          type = 'boolean'
        }
        break
      }
    }
    expression.valueType = type
    return type
  }

  const checkCondition = (keyword: string, condition: Expression) => {
    const type = checkExpression(condition)
    if (type !== 'boolean') {
      throw semanticError(`The condition of '${keyword}' must be boolean but found ${type}`, condition)
    }
  }

  const checkStatement = (statement: Statement): void => {
    switch (statement.type) {
      case 'declaration': {
        // The initializer is checked first, so `let x = x + 1;` cannot see the new x.
        const valueType = checkExpression(statement.value)
        if (statement.declaredType && statement.declaredType !== valueType) {
          throw semanticError(
            `Cannot initialize '${statement.name}' of type ${statement.declaredType} with a ${valueType} value`,
            statement,
          )
        }
        const previous = table.lookupLocal(statement.name)
        if (previous) {
          throw semanticError(`Variable '${statement.name}' is already declared in this scope (line ${previous.line})`, statement)
        }
        const entry = table.declare(statement.name, statement.declaredType ?? valueType, statement.line, statement.column)
        statement.uniqueName = entry.uniqueName
        break
      }
      case 'assignment': {
        const entry = table.lookup(statement.name)
        if (!entry) throw semanticError(`Unknown identifier '${statement.name}' (not declared in this scope)`, statement)
        const valueType = checkExpression(statement.value)
        if (valueType !== entry.type) {
          throw semanticError(`Cannot assign a ${valueType} value to '${statement.name}' of type ${entry.type}`, statement)
        }
        statement.uniqueName = entry.uniqueName
        break
      }
      case 'print':
        checkExpression(statement.value)
        break
      case 'block':
        table.enterScope()
        statement.body.forEach(checkStatement)
        table.exitScope()
        break
      case 'if':
        checkCondition('if', statement.condition)
        checkStatement(statement.thenBranch)
        if (statement.elseBranch) checkStatement(statement.elseBranch)
        break
      case 'while':
        checkCondition('while', statement.condition)
        checkStatement(statement.body)
        break
    }
  }

  program.body.forEach(checkStatement)
  return table
}
