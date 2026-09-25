import { describe, expect, it } from 'vitest'
import { execute } from './interpreter/interpreter'
import { compile } from './pipeline'

/**
 * Randomized differential test. Random typed expressions are generated as
 * trees, evaluated by an independent reference evaluator (BigInt based), and
 * compared with what the compiler prints, both with full parentheses and with
 * minimal parentheses (which exercises operator precedence and associativity),
 * with and without constant folding.
 */

type Expr =
  | { k: 'int'; v: number }
  | { k: 'bool'; v: boolean }
  | { k: 'var'; name: string }
  | { k: 'un'; op: '-' | '!'; a: Expr }
  | { k: 'bin'; op: string; a: Expr; b: Expr }

// Small deterministic PRNG (mulberry32)
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const vars: Record<string, number | boolean> = { a: 7, b: 3, z: 0, big: 2147483647, t: true, f: false }
const prelude = 'int a = 7; int b = 3; int z = 0; int big = 2147483647; boolean t = true; boolean f = false;\n'

function genInt(rand: () => number, depth: number): Expr {
  const roll = rand()
  if (depth <= 0 || roll < 0.25) {
    return rand() < 0.4 ? { k: 'var', name: ['a', 'b', 'z', 'big'][Math.floor(rand() * 4)] } : { k: 'int', v: Math.floor(rand() * 12) }
  }
  if (roll < 0.35) return { k: 'un', op: '-', a: genInt(rand, depth - 1) }
  const op = ['+', '-', '*', '/', '%'][Math.floor(rand() * 5)]
  return { k: 'bin', op, a: genInt(rand, depth - 1), b: genInt(rand, depth - 1) }
}

function genBool(rand: () => number, depth: number): Expr {
  const roll = rand()
  if (depth <= 0 || roll < 0.15) {
    return rand() < 0.5 ? { k: 'var', name: rand() < 0.5 ? 't' : 'f' } : { k: 'bool', v: rand() < 0.5 }
  }
  if (roll < 0.25) return { k: 'un', op: '!', a: genBool(rand, depth - 1) }
  if (roll < 0.55) {
    const op = ['<', '>', '<=', '>=', '==', '!='][Math.floor(rand() * 6)]
    return { k: 'bin', op, a: genInt(rand, depth - 1), b: genInt(rand, depth - 1) }
  }
  if (roll < 0.65) return { k: 'bin', op: rand() < 0.5 ? '==' : '!=', a: genBool(rand, depth - 1), b: genBool(rand, depth - 1) }
  return { k: 'bin', op: rand() < 0.5 ? '&&' : '||', a: genBool(rand, depth - 1), b: genBool(rand, depth - 1) }
}

const prec: Record<string, number> = { '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '>': 4, '<=': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 }

function print(e: Expr, minimal: boolean, parentPrec = 0, isRight = false): string {
  switch (e.k) {
    case 'int':
      return String(e.v)
    case 'bool':
      return String(e.v)
    case 'var':
      return e.name
    case 'un': {
      const inner = print(e.a, minimal, 99)
      return e.a.k === 'bin' || e.a.k === 'un' ? `${e.op}(${inner.replace(/^\((.*)\)$/s, '$1')})` : `${e.op}${inner}`
    }
    case 'bin': {
      const p = prec[e.op]
      const text = `${print(e.a, minimal, p, false)} ${e.op} ${print(e.b, minimal, p, true)}`
      const needParens = !minimal || p < parentPrec || (p === parentPrec && isRight)
      return needParens ? `(${text})` : text
    }
  }
}

// ---- reference evaluator (BigInt) -----------------------------------------
const MAX = 2147483647n
const MIN = -2147483648n
class Fail extends Error {}
const inRange = (n: bigint) => {
  if (n > MAX || n < MIN) throw new Fail('overflow')
  return n
}

function evaluate(e: Expr): bigint | boolean {
  switch (e.k) {
    case 'int':
      return BigInt(e.v)
    case 'bool':
      return e.v
    case 'var': {
      const v = vars[e.name]
      return typeof v === 'number' ? BigInt(v) : v
    }
    case 'un': {
      const v = evaluate(e.a)
      return e.op === '!' ? !(v as boolean) : inRange(-(v as bigint))
    }
    case 'bin': {
      if (e.op === '&&') return (evaluate(e.a) as boolean) && (evaluate(e.b) as boolean)
      if (e.op === '||') return (evaluate(e.a) as boolean) || (evaluate(e.b) as boolean)
      const a = evaluate(e.a)
      const b = evaluate(e.b)
      switch (e.op) {
        case '+': return inRange((a as bigint) + (b as bigint))
        case '-': return inRange((a as bigint) - (b as bigint))
        case '*': return inRange((a as bigint) * (b as bigint))
        case '/':
          if (b === 0n) throw new Fail('div')
          return inRange((a as bigint) / (b as bigint)) // BigInt division truncates toward zero
        case '%':
          if (b === 0n) throw new Fail('mod')
          return (a as bigint) % (b as bigint)
        case '<': return (a as bigint) < (b as bigint)
        case '>': return (a as bigint) > (b as bigint)
        case '<=': return (a as bigint) <= (b as bigint)
        case '>=': return (a as bigint) >= (b as bigint)
        case '==': return a === b
        case '!=': return a !== b
      }
      throw new Error('unknown operator ' + e.op)
    }
  }
}

function expected(e: Expr): { output: string } | { failed: true } {
  try {
    return { output: String(evaluate(e)) }
  } catch (error) {
    if (error instanceof Fail) return { failed: true }
    throw error
  }
}

describe('randomized differential test against a reference evaluator', () => {
  const rand = rng(20260925)
  const cases: Expr[] = []
  for (let i = 0; i < 2500; i++) cases.push(rand() < 0.5 ? genInt(rand, 4) : genBool(rand, 4))

  it('matches for full and minimal parentheses, with and without constant folding', () => {
    let checked = 0
    let runtimeErrors = 0
    for (const e of cases) {
      const want = expected(e)
      for (const minimal of [false, true]) {
        const source = `${prelude}print ${print(e, minimal)};`
        const result = compile(source)
        if ('failed' in want) {
          expect(result.error?.stage, source).toBe('runtime')
          runtimeErrors++
        } else {
          expect(result.error, source).toBeUndefined()
          expect(result.output, source).toEqual([want.output])
          // The unoptimized program must agree with the optimized one.
          expect(execute(result.unoptimized).output, source).toEqual([want.output])
        }
        checked++
      }
    }
    expect(checked).toBe(cases.length * 2)
    expect(runtimeErrors).toBeGreaterThan(0) // the generator does exercise runtime errors
  })
})
