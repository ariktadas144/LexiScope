import { INT_MAX, INT_MIN } from './lexer/token'

export type Value = number | boolean | string

export type EvalResult = { ok: true; value: Value } | { ok: false; message: string }

const isInt32 = (n: number) => Number.isInteger(n) && n >= INT_MIN && n <= INT_MAX

/** Removes negative zero so that `0 * -5` prints as `0`. */
const norm = (n: number) => (n === 0 ? 0 : n)

/**
 * Single source of truth for what Lexi operators mean at run time.
 * It is shared by the TAC interpreter and the constant folder, so folding a
 * constant expression can never change what the program computes.
 */
export function evalBinary(operator: string, a: Value, b: Value): EvalResult {
  if (typeof a === 'number' && typeof b === 'number') {
    switch (operator) {
      case '+':
      case '-':
      case '*': {
        const result = operator === '+' ? a + b : operator === '-' ? a - b : a * b
        return isInt32(result) ? { ok: true, value: norm(result) } : { ok: false, message: 'Integer overflow' }
      }
      case '/': {
        if (b === 0) return { ok: false, message: 'Division by zero' }
        const result = Math.trunc(a / b)
        return isInt32(result) ? { ok: true, value: norm(result) } : { ok: false, message: 'Integer overflow' }
      }
      case '%':
        if (b === 0) return { ok: false, message: 'Modulo by zero' }
        return { ok: true, value: norm(a % b) }
      case '<':
        return { ok: true, value: a < b }
      case '>':
        return { ok: true, value: a > b }
      case '<=':
        return { ok: true, value: a <= b }
      case '>=':
        return { ok: true, value: a >= b }
    }
  }
  switch (operator) {
    case '==':
      return { ok: true, value: a === b }
    case '!=':
      return { ok: true, value: a !== b }
    case '&&':
      return { ok: true, value: a === true && b === true }
    case '||':
      return { ok: true, value: a === true || b === true }
  }
  return { ok: false, message: `Invalid operands for '${operator}'` }
}

export function evalUnary(operator: string, operand: Value): EvalResult {
  if (operator === '!' && typeof operand === 'boolean') return { ok: true, value: !operand }
  if ((operator === '-' || operator === 'neg') && typeof operand === 'number') {
    const result = 0 - operand
    return isInt32(result) ? { ok: true, value: norm(result) } : { ok: false, message: 'Integer overflow' }
  }
  return { ok: false, message: `Invalid operand for '${operator}'` }
}

export function formatValue(value: Value): string {
  return typeof value === 'string' ? value : String(value)
}
