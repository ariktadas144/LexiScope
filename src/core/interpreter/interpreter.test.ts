import { describe, expect, it } from 'vitest'
import { generateTac } from '../codegen/tacGenerator'
import { analyzedProgram } from '../testUtils'
import { execute } from './interpreter'

const run = (source: string, maxSteps?: number) => execute(generateTac(analyzedProgram(source)), maxSteps)

describe('interpreter (TAC virtual machine)', () => {
  it('evaluates a print statement', () => {
    expect(run('print 2 + 3;').output).toEqual(['5'])
  })

  it('keeps variables in the environment under their unique names', () => {
    const result = run('let x = 1; { let x = 2; } x = x + 10;')
    expect(result.environment.get('x')).toBe(11)
    expect(result.environment.get('x.2')).toBe(2)
  })

  it('prints ints, booleans and strings', () => {
    expect(run('print 42; print true; print "hello world"; print "";').output).toEqual(['42', 'true', 'hello world', ''])
  })

  it('respects operator precedence at run time', () => {
    expect(run('print 2 + 3 * 4; print (2 + 3) * 4; print 10 - 3 - 2;').output).toEqual(['14', '20', '5'])
  })

  it('does integer arithmetic', () => {
    expect(run('print 7 / 2; print -7 / 2; print 7 % 3; print -7 % 3; print 0 - 5;').output).toEqual(['3', '-3', '1', '-1', '-5'])
  })

  it('executes if / else / else-if', () => {
    const program = (n: number) => `let n = ${n}; if (n < 0) { print "neg"; } else if (n == 0) { print "zero"; } else { print "pos"; }`
    expect(run(program(-2)).output).toEqual(['neg'])
    expect(run(program(0)).output).toEqual(['zero'])
    expect(run(program(9)).output).toEqual(['pos'])
  })

  it('executes while loops', () => {
    expect(run('let i = 1; let sum = 0; while (i <= 5) { sum = sum + i; i = i + 1; } print sum;').output).toEqual(['15'])
  })

  it('computes factorial and fibonacci', () => {
    expect(run('let n = 5; let f = 1; while (n > 1) { f = f * n; n = n - 1; } print f;').output).toEqual(['120'])
    expect(run('let a = 0; let b = 1; let i = 0; while (i < 10) { let t = a + b; a = b; b = t; i = i + 1; } print a;').output).toEqual(['55'])
  })

  it('re-initializes variables declared inside a loop body each iteration', () => {
    expect(run('let i = 0; while (i < 3) { let sq = i * i; print sq; i = i + 1; }').output).toEqual(['0', '1', '4'])
  })

  it('uses the right variable when scopes shadow each other', () => {
    expect(run('let x = 1; { let x = 2; print x; } print x;').output).toEqual(['2', '1'])
  })

  it('short-circuits && and || (the right side is not evaluated)', () => {
    expect(run('let z = 0; print false && (1 / z == 0);').output).toEqual(['false'])
    expect(run('let z = 0; print true || (1 / z == 0);').output).toEqual(['true'])
    expect(run('print true && true; print false || false; print true && false; print false || true;').output).toEqual(['true', 'false', 'false', 'true'])
  })

  it('evaluates the right side when needed', () => {
    const result = run('let z = 0; print true && (1 / z == 0);')
    expect(result.error?.message).toBe('Division by zero')
  })

  it('reports division and modulo by zero with a position and keeps earlier output', () => {
    const result = run('print 1;\nprint 10 / 0;\nprint 2;')
    expect(result.output).toEqual(['1'])
    expect(result.error).toMatchObject({ stage: 'runtime', message: 'Division by zero', line: 2, column: 10 })
    expect(run('print 5 % 0;').error?.message).toBe('Modulo by zero')
  })

  it('detects integer overflow', () => {
    expect(run('print 2147483647 + 1;').error?.message).toBe('Integer overflow')
    expect(run('print 65536 * 65536;').error?.message).toBe('Integer overflow')
    expect(run('print 0 - 2147483647 - 2;').error?.message).toBe('Integer overflow')
    expect(run('print 2147483647 + 0; print 0 - 2147483647 - 1;').output).toEqual(['2147483647', '-2147483648'])
  })

  it('stops non-terminating programs at the step limit', () => {
    const result = run('while (true) { }')
    expect(result.error?.message).toContain('possible infinite loop')
    expect(result.error?.stage).toBe('runtime')
    expect(result.steps).toBeGreaterThan(0)
  })

  it('honours a custom step limit', () => {
    expect(run('let i = 0; while (i < 1000) { i = i + 1; }', 50).error).toBeDefined()
    expect(run('let i = 0; while (i < 10) { i = i + 1; }', 1000).error).toBeUndefined()
  })

  it('limits the number of output lines', () => {
    const result = run('let i = 0; while (i < 5000) { print i; i = i + 1; }')
    expect(result.error?.message).toContain('Output limit')
    expect(result.output).toHaveLength(1000)
  })
})
