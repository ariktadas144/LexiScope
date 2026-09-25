import { describe, expect, it } from 'vitest'
import { CompilerError } from '../errors/CompilerError'
import { parseSource } from '../testUtils'
import type { Expression, Program } from './ast'

/** Compact prefix form of an expression, e.g. (+ 2 (* 3 4)). */
function show(expression: Expression): string {
  switch (expression.type) {
    case 'literal':
      return typeof expression.value === 'string' ? `"${expression.value}"` : String(expression.value)
    case 'identifier':
      return expression.name
    case 'unary':
      return `(${expression.operator} ${show(expression.operand)})`
    case 'binary':
      return `(${expression.operator} ${show(expression.left)} ${show(expression.right)})`
  }
}

const exprOf = (source: string) => {
  const statement = parseSource(`print ${source};`).body[0]
  if (statement.type !== 'print') throw new Error('expected print')
  return show(statement.value)
}

const syntaxError = (source: string): CompilerError => {
  try {
    parseSource(source)
  } catch (error) {
    if (error instanceof CompilerError) return error
    throw error
  }
  throw new Error('expected a syntax error for: ' + source)
}

describe('parser: statements', () => {
  it('creates a program node', () => {
    const program: Program = parseSource('print 2 + 3;')
    expect(program.type).toBe('program')
    expect(program.body).toHaveLength(1)
  })

  it('accepts an empty program', () => {
    expect(parseSource('').body).toEqual([])
  })

  it('parses typed and inferred declarations', () => {
    const [a, b, c, d] = parseSource('int a = 1; boolean b = true; string c = "s"; let d = 4;').body
    expect(a).toMatchObject({ type: 'declaration', declaredType: 'int', name: 'a' })
    expect(b).toMatchObject({ declaredType: 'boolean' })
    expect(c).toMatchObject({ declaredType: 'string' })
    expect(d).toMatchObject({ declaredType: null })
  })

  it('parses assignment', () => {
    expect(parseSource('x = 5;').body[0]).toMatchObject({ type: 'assignment', name: 'x' })
  })

  it('parses print with and without parentheses', () => {
    expect(exprOf('(1 + 2)')).toBe('(+ 1 2)')
    expect(parseSource('print(y);').body[0]).toMatchObject({ type: 'print', value: { type: 'identifier', name: 'y' } })
  })

  it('parses if, if/else and else-if chains', () => {
    const [plain, withElse, chain] = parseSource(
      'if (a) { } if (a) { } else { } if (a) { } else if (b) { } else { }',
    ).body
    expect(plain).toMatchObject({ type: 'if' })
    expect(plain).not.toHaveProperty('elseBranch')
    expect(withElse).toMatchObject({ elseBranch: { type: 'block' } })
    expect(chain).toMatchObject({ elseBranch: { type: 'if', elseBranch: { type: 'block' } } })
  })

  it('parses while and nested blocks', () => {
    const program = parseSource('while (a < 3) { { print a; } }')
    expect(program.body[0]).toMatchObject({ type: 'while', body: { type: 'block', body: [{ type: 'block' }] } })
  })

  it('records statement positions', () => {
    expect(parseSource('\n  print 1;').body[0]).toMatchObject({ line: 2, column: 3 })
  })
})

describe('parser: expressions', () => {
  it('gives * and / higher precedence than + and -', () => {
    expect(exprOf('2 + 3 * 4')).toBe('(+ 2 (* 3 4))')
    expect(exprOf('2 * 3 + 4')).toBe('(+ (* 2 3) 4)')
    expect(exprOf('10 - 6 / 2')).toBe('(- 10 (/ 6 2))')
  })

  it('is left-associative', () => {
    expect(exprOf('10 - 3 - 2')).toBe('(- (- 10 3) 2)')
    expect(exprOf('100 / 10 / 5')).toBe('(/ (/ 100 10) 5)')
    expect(exprOf('7 % 4 % 2')).toBe('(% (% 7 4) 2)')
  })

  it('honours parentheses', () => {
    expect(exprOf('(2 + 3) * 4')).toBe('(* (+ 2 3) 4)')
    expect(exprOf('((1))')).toBe('1')
  })

  it('orders comparison, equality, &&, || by precedence', () => {
    expect(exprOf('1 + 2 < 4')).toBe('(< (+ 1 2) 4)')
    expect(exprOf('a < b == c < d')).toBe('(== (< a b) (< c d))')
    expect(exprOf('a || b && c')).toBe('(|| a (&& b c))')
    expect(exprOf('a && b == c')).toBe('(&& a (== b c))')
  })

  it('binds unary operators tighter than binary ones', () => {
    expect(exprOf('-2 * 3')).toBe('(* (- 2) 3)')
    expect(exprOf('!a && b')).toBe('(&& (! a) b)')
    expect(exprOf('- -5')).toBe('(- (- 5))')
    expect(exprOf('!!a')).toBe('(! (! a))')
  })

  it('parses literals', () => {
    expect(exprOf('true')).toBe('true')
    expect(exprOf('"hi"')).toBe('"hi"')
    expect(exprOf('""')).toBe('""')
  })

  it('stores the operator position on binary nodes', () => {
    const statement = parseSource('print 1 + 2;').body[0]
    if (statement.type !== 'print') throw new Error('expected print')
    expect(statement.value).toMatchObject({ type: 'binary', line: 1, column: 9 })
  })
})

describe('parser: syntax errors', () => {
  it('reports a missing semicolon at the end of the statement', () => {
    const error = syntaxError('let value = 4\nprint value;')
    expect(error.stage).toBe('syntax')
    expect(error.message).toBe("Expected ';' but found 'print'")
    expect([error.line, error.column]).toEqual([1, 14])
  })

  it('reports a missing semicolon at end of file', () => {
    expect(syntaxError('print 1').message).toContain('end of file')
  })

  it('reports a missing expression', () => {
    expect(syntaxError('let a = ;').message).toBe("Expected an expression but found ';'")
    expect(syntaxError('print 1 + ;').message).toContain('Expected an expression')
  })

  it('reports a missing identifier and missing =', () => {
    expect(syntaxError('let = 5;').message).toContain('Expected an identifier')
    expect(syntaxError('let a 5;').message).toContain("Expected '='")
    expect(syntaxError('a + 1;').message).toContain("Expected '='")
  })

  it('reports unbalanced parentheses and braces', () => {
    expect(syntaxError('print (1 + 2;').message).toContain("Expected ')'")
    expect(syntaxError('if (a { }').message).toContain("Expected ')'")
    expect(syntaxError('while (true) { print 1;').message).toContain("Expected '}'")
    expect(syntaxError('}').message).toContain("Unexpected '}'")
  })

  it('requires parentheses and braces around if/while parts', () => {
    expect(syntaxError('if a { }').message).toContain("Expected '('")
    expect(syntaxError('if (a) print 1;').message).toContain("Expected '{'")
    expect(syntaxError('while (a) print 1;').message).toContain("Expected '{'")
  })

  it('rejects a dangling else', () => {
    expect(syntaxError('else { }').message).toContain("'else' without a matching 'if'")
  })

  it('rejects a keyword used as a variable name', () => {
    expect(syntaxError('let if = 1;').message).toContain('Expected an identifier')
  })

  it('reports the line and column of an unexpected token', () => {
    const error = syntaxError('\n\n  )')
    expect([error.line, error.column]).toEqual([3, 3])
  })
})
