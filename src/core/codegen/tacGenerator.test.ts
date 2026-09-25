import { describe, expect, it } from 'vitest'
import { generateTac } from './tacGenerator'
import { analyzedProgram, tacLines } from '../testUtils'

describe('TAC generator', () => {
  it('emits print instructions', () => {
    expect(generateTac(analyzedProgram('print 2;'))[0].op).toBe('print')
  })

  it('lowers the review example exactly', () => {
    expect(tacLines('int x = 10; int y = x + 5; print y;')).toEqual(['x = 10', 't1 = x + 5', 'y = t1', 'print y'])
  })

  it('numbers temporaries in evaluation order (inner first)', () => {
    expect(tacLines('let base = 7; let bonus = 5; print base + bonus * 2;')).toEqual([
      'base = 7', 'bonus = 5', 't1 = bonus * 2', 't2 = base + t1', 'print t2',
    ])
    expect(tacLines('print (1 + 2) * 3;')).toEqual(['t1 = 1 + 2', 't2 = t1 * 3', 'print t2'])
  })

  it('emits unary operators', () => {
    expect(tacLines('let a = 5; print -a; print !(a > 1);')).toEqual([
      'a = 5', 't1 = -a', 'print t1', 't2 = a > 1', 't3 = !t2', 'print t3',
    ])
  })

  it('quotes string operands and keeps boolean literals', () => {
    expect(tacLines('let s = "hi"; let b = true;')).toEqual(['s = "hi"', 'b = true'])
  })

  it('lowers if without else', () => {
    expect(tacLines('let a = 1; if (a < 2) { print a; }')).toEqual([
      'a = 1', 't1 = a < 2', 'ifFalse t1 goto L1', 'print a', 'L1:',
    ])
  })

  it('lowers if/else', () => {
    expect(tacLines('if (true) { print 1; } else { print 2; }')).toEqual([
      'ifFalse true goto L1', 'print 1', 'goto L2', 'L1:', 'print 2', 'L2:',
    ])
  })

  it('lowers else-if chains with distinct labels', () => {
    const lines = tacLines('if (true) { print 1; } else if (false) { print 2; } else { print 3; }')
    const labels = lines.filter((l) => l.endsWith(':'))
    expect(new Set(labels).size).toBe(labels.length)
    expect(lines).toContain('ifFalse false goto L3')
  })

  it('lowers while loops with a back edge', () => {
    expect(tacLines('let i = 0; while (i < 3) { i = i + 1; }')).toEqual([
      'i = 0', 'L1:', 't1 = i < 3', 'ifFalse t1 goto L2', 't2 = i + 1', 'i = t2', 'goto L1', 'L2:',
    ])
  })

  it('short-circuits &&', () => {
    expect(tacLines('let a = true; let b = false; print a && b;')).toEqual([
      'a = true', 'b = false', 't1 = a', 'ifFalse t1 goto L1', 't1 = b', 'L1:', 'print t1',
    ])
  })

  it('short-circuits ||', () => {
    expect(tacLines('let a = true; let b = false; print a || b;')).toEqual([
      'a = true', 'b = false', 't1 = a', 'ifFalse t1 goto L1', 'goto L2', 'L1:', 't1 = b', 'L2:', 'print t1',
    ])
  })

  it('uses unique names for shadowed variables', () => {
    expect(tacLines('let x = 1; { let x = 2; print x; } print x;')).toEqual(['x = 1', 'x.2 = 2', 'print x.2', 'print x'])
  })

  it('numbers instructions from 1 and stores source positions', () => {
    const tac = generateTac(analyzedProgram('let a = 1;\nprint a / 2;'))
    expect(tac.map((i) => i.index)).toEqual([1, 2, 3])
    expect(tac[1]).toMatchObject({ op: '/', line: 2, column: 9 })
  })
})
