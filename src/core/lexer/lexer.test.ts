import { describe, expect, it } from 'vitest'
import { lex } from './lexer'

const kinds = (source: string) => lex(source).map((t) => `${t.kind}:${t.lexeme}`)

describe('lexer', () => {
  it('recognizes declarations and operators', () => {
    expect(lex('let total = 4 + 2;').map((t) => t.lexeme)).toEqual(['let', 'total', '=', '4', '+', '2', ';', ''])
  })

  it('classifies keywords, identifiers, numbers, strings and punctuation', () => {
    expect(kinds('int x = 10; print "hi";')).toEqual([
      'keyword:int', 'identifier:x', 'operator:=', 'number:10', 'punctuation:;',
      'keyword:print', 'string:"hi"', 'punctuation:;', 'eof:',
    ])
  })

  it('treats every reserved word as a keyword', () => {
    for (const word of ['let', 'int', 'boolean', 'string', 'print', 'if', 'else', 'while', 'true', 'false']) {
      expect(lex(word)[0].kind).toBe('keyword')
    }
  })

  it('does not treat keyword prefixes as keywords', () => {
    expect(lex('letter iffy whiled')[0].kind).toBe('identifier')
    expect(lex('letter iffy whiled').filter((t) => t.kind === 'identifier')).toHaveLength(3)
  })

  it('reads identifiers with digits and underscores', () => {
    expect(lex('_a1 b_2')[0]).toMatchObject({ kind: 'identifier', lexeme: '_a1' })
    expect(lex('_a1 b_2')[1]).toMatchObject({ kind: 'identifier', lexeme: 'b_2' })
  })

  it('reads all two-character operators before single-character ones', () => {
    const ops = lex('== != <= >= && || < > = !').filter((t) => t.kind === 'operator').map((t) => t.lexeme)
    expect(ops).toEqual(['==', '!=', '<=', '>=', '&&', '||', '<', '>', '=', '!'])
  })

  it('reads arithmetic operators and braces', () => {
    expect(lex('+ - * / % ( ) { }').filter((t) => t.kind !== 'eof').map((t) => t.lexeme)).toEqual(['+', '-', '*', '/', '%', '(', ')', '{', '}'])
  })

  it('tracks line and column (1-based) across lines', () => {
    const tokens = lex('let x = 1;\n  print x;')
    expect(tokens[0]).toMatchObject({ lexeme: 'let', line: 1, column: 1 })
    expect(tokens[1]).toMatchObject({ lexeme: 'x', line: 1, column: 5 })
    const print = tokens.find((t) => t.lexeme === 'print')
    expect(print).toMatchObject({ line: 2, column: 3 })
  })

  it('handles Windows line endings', () => {
    const tokens = lex('let a = 1;\r\nprint a;')
    expect(tokens.find((t) => t.lexeme === 'print')).toMatchObject({ line: 2, column: 1 })
  })

  it('emits comment tokens and continues on the next line', () => {
    const tokens = lex('// hello\nlet a = 1; // trailing')
    expect(tokens[0]).toMatchObject({ kind: 'comment', lexeme: '// hello', line: 1, column: 1 })
    expect(tokens[1]).toMatchObject({ kind: 'keyword', line: 2, column: 1 })
    expect(tokens[tokens.length - 2]).toMatchObject({ kind: 'comment', lexeme: '// trailing' })
  })

  it('does not confuse division with a comment', () => {
    expect(kinds('8 / 2')).toEqual(['number:8', 'operator:/', 'number:2', 'eof:'])
  })

  it('always ends with a single eof token, even for empty input', () => {
    expect(kinds('')).toEqual(['eof:'])
    expect(kinds('   \n  ')).toEqual(['eof:'])
  })

  it('reports an unexpected character with its position', () => {
    const error = lex('let value = 4 @ 2;').find((t) => t.kind === 'error')
    expect(error).toMatchObject({ lexeme: '@', line: 1, column: 15 })
    expect(error?.message).toContain("'@'")
  })

  it('keeps scanning after an error so later tokens are still produced', () => {
    const tokens = lex('4 @ 2')
    expect(tokens.map((t) => t.kind)).toEqual(['number', 'error', 'number', 'eof'])
  })

  it('reports a single & or | with a hint', () => {
    expect(lex('a & b').find((t) => t.kind === 'error')?.message).toContain('&&')
    expect(lex('a | b').find((t) => t.kind === 'error')?.message).toContain('||')
  })

  it('reports an unterminated string, including at a newline', () => {
    const error = lex('let s = "hello;\nprint s;').find((t) => t.kind === 'error')
    expect(error).toMatchObject({ line: 1, column: 9 })
    expect(error?.message).toContain('Unterminated')
    expect(lex('"abc').find((t) => t.kind === 'error')).toBeDefined()
  })

  it('accepts an empty string', () => {
    expect(lex('""')[0]).toMatchObject({ kind: 'string', lexeme: '""' })
  })

  it('rejects decimal numbers and malformed numbers', () => {
    expect(lex('1.5').find((t) => t.kind === 'error')?.message).toContain('Decimal')
    expect(lex('12abc').find((t) => t.kind === 'error')?.message).toContain('Invalid number')
    expect(lex('1.').some((t) => t.kind === 'error')).toBe(true)
  })

  it('checks the int range', () => {
    expect(lex('2147483647')[0].kind).toBe('number')
    expect(lex('2147483648')[0]).toMatchObject({ kind: 'error' })
    expect(lex('2147483648')[0].message).toContain('out of range')
  })

  it('reports a non-ASCII character once with a correct column', () => {
    const tokens = lex('a 😀 b')
    const errors = tokens.filter((t) => t.kind === 'error')
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({ lexeme: '😀', column: 3 })
    expect(tokens.find((t) => t.lexeme === 'b')).toMatchObject({ column: 5 })
  })
})
