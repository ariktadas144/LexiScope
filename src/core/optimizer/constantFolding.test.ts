import { describe, expect, it } from 'vitest'
import { generateTac } from '../codegen/tacGenerator'
import { formatInstruction } from '../codegen/instruction'
import { analyzedProgram } from '../testUtils'
import { foldProgram } from './constantFolding'

const folded = (source: string) => generateTac(foldProgram(analyzedProgram(source))).map(formatInstruction)

describe('constant folding', () => {
  it('folds arithmetic with correct precedence', () => {
    expect(folded('print 2 + 3 * 4;')).toEqual(['print 14'])
    expect(folded('print (2 + 3) * 4;')).toEqual(['print 20'])
    expect(folded('print 10 - 3 - 2;')).toEqual(['print 5'])
  })

  it('uses integer division that truncates toward zero', () => {
    expect(folded('print 7 / 2;')).toEqual(['print 3'])
    expect(folded('print -7 / 2;')).toEqual(['print -3'])
    expect(folded('print 7 % 3;')).toEqual(['print 1'])
    expect(folded('print -7 % 3;')).toEqual(['print -1'])
  })

  it('folds comparisons, equality and logic', () => {
    expect(folded('print 1 < 2;')).toEqual(['print true'])
    expect(folded('print 3 == 4;')).toEqual(['print false'])
    expect(folded('print true && false;')).toEqual(['print false'])
    expect(folded('print false || true;')).toEqual(['print true'])
    expect(folded('print !true;')).toEqual(['print false'])
    expect(folded('print "a" == "a";')).toEqual(['print true'])
  })

  it('folds unary minus and never produces negative zero', () => {
    expect(folded('print -5;')).toEqual(['print -5'])
    expect(folded('print 0 * -5;')).toEqual(['print 0'])
    expect(folded('print -0;')).toEqual(['print 0'])
  })

  it('folds only the constant part of a mixed expression', () => {
    expect(folded('let x = 3; print x + 2 * 5;')).toEqual(['x = 3', 't1 = x + 10', 'print t1'])
  })

  it('applies short-circuit identities with a literal left operand', () => {
    expect(folded('let a = true; print false && a;')).toEqual(['a = true', 'print false'])
    expect(folded('let a = true; print true && a;')).toEqual(['a = true', 'print a'])
    expect(folded('let a = true; print true || a;')).toEqual(['a = true', 'print true'])
    expect(folded('let a = true; print false || a;')).toEqual(['a = true', 'print a'])
  })

  it('does not fold operations that fail at run time', () => {
    expect(folded('print 1 / 0;')).toEqual(['t1 = 1 / 0', 'print t1'])
    expect(folded('print 5 % 0;')).toEqual(['t1 = 5 % 0', 'print t1'])
    expect(folded('print 2147483647 + 1;')).toEqual(['t1 = 2147483647 + 1', 'print t1'])
    expect(folded('print 65536 * 65536;')).toEqual(['t1 = 65536 * 65536', 'print t1'])
  })

  it('folds inside conditions and loops', () => {
    expect(folded('if (1 < 2) { print 1; }')[0]).toBe('ifFalse true goto L1')
    expect(folded('let i = 0; while (i < 2 + 1) { i = i + 1; }')).toContain('t1 = i < 3')
  })

  it('does not modify the original AST', () => {
    const program = analyzedProgram('print 1 + 2;')
    foldProgram(program)
    const statement = program.body[0]
    if (statement.type !== 'print') throw new Error('expected print')
    expect(statement.value.type).toBe('binary')
  })
})
