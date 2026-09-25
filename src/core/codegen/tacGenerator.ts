import type { BlockStatement, Expression, IfStatement, Program, Statement } from '../parser/ast'
import type { Instruction, Opcode } from './instruction'

interface Position {
  line: number
  column: number
}

/**
 * Lowers the annotated AST to three-address code.
 * Conventions:
 *  - literals and variables are used directly as operands;
 *  - every operator result goes into a fresh temporary (t1, t2, ...);
 *  - control flow uses labels (L1, L2, ...), `goto` and `ifFalse`;
 *  - `&&` and `||` short-circuit, exactly like the interpreter expects.
 */
export function generateTac(program: Program): Instruction[] {
  const instructions: Instruction[] = []
  let temporaries = 0
  let labels = 0

  const newTemp = () => `t${++temporaries}`
  const newLabel = () => `L${++labels}`

  const emit = (op: Opcode, fields: Partial<Pick<Instruction, 'arg1' | 'arg2' | 'result'>>, at?: Position) => {
    const instruction: Instruction = { index: instructions.length + 1, op, ...fields }
    if (at) {
      instruction.line = at.line
      instruction.column = at.column
    }
    instructions.push(instruction)
  }

  const operand = (expression: Expression): string => {
    switch (expression.type) {
      case 'literal':
        return typeof expression.value === 'string' ? `"${expression.value}"` : String(expression.value)
      case 'identifier':
        return expression.uniqueName ?? expression.name
      case 'unary': {
        const value = operand(expression.operand)
        const result = newTemp()
        emit(expression.operator === '!' ? '!' : 'neg', { arg1: value, result }, expression)
        return result
      }
      case 'binary': {
        if (expression.operator === '&&') return shortCircuitAnd(expression)
        if (expression.operator === '||') return shortCircuitOr(expression)
        // Operands first, so inner temporaries get the lower numbers.
        const left = operand(expression.left)
        const right = operand(expression.right)
        const result = newTemp()
        emit(expression.operator, { arg1: left, arg2: right, result }, expression)
        return result
      }
    }
  }

  // t = a; ifFalse t goto Lend; t = b; Lend:
  const shortCircuitAnd = (expression: Extract<Expression, { type: 'binary' }>): string => {
    const left = operand(expression.left)
    const result = newTemp()
    const end = newLabel()
    emit('assign', { arg1: left, result }, expression)
    emit('ifFalse', { arg1: result, arg2: end }, expression)
    emit('assign', { arg1: operand(expression.right), result }, expression)
    emit('label', { arg1: end })
    return result
  }

  // t = a; ifFalse t goto Lright; goto Lend; Lright: t = b; Lend:
  const shortCircuitOr = (expression: Extract<Expression, { type: 'binary' }>): string => {
    const left = operand(expression.left)
    const result = newTemp()
    const right = newLabel()
    const end = newLabel()
    emit('assign', { arg1: left, result }, expression)
    emit('ifFalse', { arg1: result, arg2: right }, expression)
    emit('goto', { arg1: end }, expression)
    emit('label', { arg1: right })
    emit('assign', { arg1: operand(expression.right), result }, expression)
    emit('label', { arg1: end })
    return result
  }

  const block = (statement: BlockStatement) => statement.body.forEach(statementCode)

  const ifCode = (statement: IfStatement) => {
    const condition = operand(statement.condition)
    const elseLabel = newLabel()
    emit('ifFalse', { arg1: condition, arg2: elseLabel }, statement)
    block(statement.thenBranch)
    if (statement.elseBranch) {
      const endLabel = newLabel()
      emit('goto', { arg1: endLabel }, statement)
      emit('label', { arg1: elseLabel })
      if (statement.elseBranch.type === 'if') ifCode(statement.elseBranch)
      else block(statement.elseBranch)
      emit('label', { arg1: endLabel })
    } else {
      emit('label', { arg1: elseLabel })
    }
  }

  const statementCode = (statement: Statement): void => {
    switch (statement.type) {
      case 'declaration':
      case 'assignment':
        emit('assign', { arg1: operand(statement.value), result: statement.uniqueName ?? statement.name }, statement)
        break
      case 'print':
        emit('print', { arg1: operand(statement.value) }, statement)
        break
      case 'block':
        block(statement)
        break
      case 'if':
        ifCode(statement)
        break
      case 'while': {
        const start = newLabel()
        const end = newLabel()
        emit('label', { arg1: start })
        emit('ifFalse', { arg1: operand(statement.condition), arg2: end }, statement)
        block(statement.body)
        emit('goto', { arg1: start }, statement)
        emit('label', { arg1: end })
        break
      }
    }
  }

  program.body.forEach(statementCode)
  return instructions
}
