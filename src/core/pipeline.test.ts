import { describe, expect, it } from 'vitest'
import { compile } from './pipeline'

const stageStatuses = (source: string) => compile(source).stages.map((s) => `${s.name}:${s.status}`)

describe('pipeline: success', () => {
  it('produces every representation for the review example', () => {
    const result = compile('int x = 10;\nint y = x + 5;\nprint y;')
    expect(result.error).toBeUndefined()
    expect(result.tokens.filter((t) => t.kind !== 'eof')).toHaveLength(15)
    expect(result.ast?.body).toHaveLength(3)
    expect(result.symbols.map((s) => `${s.name}:${s.type}:${s.scope}`)).toEqual(['x:int:global', 'y:int:global'])
    expect(result.output).toEqual(['15'])
    expect(stageStatuses('int x = 1;')).toEqual(['lexical:ok', 'syntax:ok', 'semantic:ok', 'codegen:ok', 'execution:ok'])
  })

  it('shows final variable values in the symbol table', () => {
    const result = compile('let a = 2; let b = a * 3; let ok = b > 5; let s = "hi";')
    expect(result.symbols.map((s) => s.value)).toEqual(['2', '6', 'true', 'hi'])
  })

  it('keeps a symbol declared in a loop body and shows its last value', () => {
    const result = compile('let i = 0; while (i < 3) { let sq = i * i; i = i + 1; }')
    expect(result.symbols.find((s) => s.name === 'sq')?.value).toBe('4')
  })

  it('returns both unoptimized and constant-folded code', () => {
    const result = compile('print 2 + 3 * 4;')
    expect(result.unoptimized.length).toBe(3)
    expect(result.instructions.map((i) => i.op)).toEqual(['print'])
    expect(result.output).toEqual(['14'])
  })

  it('handles an empty program and comment-only input', () => {
    expect(compile('').error).toBeUndefined()
    expect(compile('// nothing here').output).toEqual([])
    expect(compile('// nothing here').tokens.map((t) => t.kind)).toEqual(['comment', 'eof'])
  })
})

describe('pipeline: errors stop at the failing phase and keep earlier results', () => {
  it('lexical error keeps all tokens', () => {
    const result = compile('let value = 4 @ 2;')
    expect(result.error).toMatchObject({ stage: 'lexical', line: 1, column: 15 })
    expect(result.tokens.length).toBeGreaterThan(5)
    expect(result.ast).toBeUndefined()
    expect(stageStatuses('let value = 4 @ 2;')).toEqual(['lexical:error', 'syntax:skipped', 'semantic:skipped', 'codegen:skipped', 'execution:skipped'])
  })

  it('syntax error keeps the tokens', () => {
    const result = compile('let value = 4\nprint value;')
    expect(result.error).toMatchObject({ stage: 'syntax', line: 1, column: 14 })
    expect(result.tokens.length).toBeGreaterThan(5)
    expect(result.ast).toBeUndefined()
    expect(stageStatuses('let a = ;')).toEqual(['lexical:ok', 'syntax:error', 'semantic:skipped', 'codegen:skipped', 'execution:skipped'])
  })

  it('semantic error keeps the AST and the symbols found so far', () => {
    const result = compile('let a = 1;\nlet b = 2;\nprint c;')
    expect(result.error).toMatchObject({ stage: 'semantic', line: 3, column: 7 })
    expect(result.ast).toBeDefined()
    expect(result.symbols.map((s) => s.name)).toEqual(['a', 'b'])
    expect(result.instructions).toEqual([])
    expect(stageStatuses('print c;')).toEqual(['lexical:ok', 'syntax:ok', 'semantic:error', 'codegen:skipped', 'execution:skipped'])
  })

  it('runtime error keeps everything, including output produced before the error', () => {
    const result = compile('print 1;\nlet z = 0;\nprint 5 / z;')
    expect(result.error).toMatchObject({ stage: 'runtime', message: 'Division by zero', line: 3, column: 9 })
    expect(result.output).toEqual(['1'])
    expect(result.ast).toBeDefined()
    expect(result.instructions.length).toBeGreaterThan(0)
    expect(result.symbols.find((s) => s.name === 'z')?.value).toBe('0')
    expect(stageStatuses('print 1 / 0;')).toEqual(['lexical:ok', 'syntax:ok', 'semantic:ok', 'codegen:ok', 'execution:error'])
  })

  it('reports only the first error', () => {
    expect(compile('let a = 1 @;\nprint b;').error?.stage).toBe('lexical')
  })
})

describe('pipeline: robustness', () => {
  it('handles very deep nesting without crashing', () => {
    const source = 'print ' + '('.repeat(20000) + '1' + ')'.repeat(20000) + ';'
    const result = compile(source)
    expect(result.error).toBeDefined()
    expect(result.error?.message).toMatch(/deeply nested/)
  })

  it('handles a very long expression chain without crashing', () => {
    const result = compile('print ' + '1 + '.repeat(30000) + '1;')
    expect(result.error === undefined || /deeply nested/.test(result.error.message)).toBe(true)
  })

  it('handles a program with thousands of statements quickly', () => {
    const source = 'let a = 0;\n' + 'a = a + 1;\n'.repeat(3000) + 'print a;'
    const started = Date.now()
    const result = compile(source)
    expect(result.output).toEqual(['3000'])
    expect(Date.now() - started).toBeLessThan(3000)
  })

  it('stops an infinite loop quickly', () => {
    const started = Date.now()
    const result = compile('while (true) { }')
    expect(result.error?.stage).toBe('runtime')
    expect(Date.now() - started).toBeLessThan(2000)
  })

  it('does not throw for arbitrary garbage', () => {
    const garbage = ['@@@', '"', '{{{{', '}}}}', '((((', 'let', 'if', 'while (', '1 +', '\u0000', '😀😀', 'let x = ;;;;', 'int 1 = x;']
    for (const source of garbage) {
      expect(() => compile(source)).not.toThrow()
      expect(compile(source).error).toBeDefined()
    }
  })
})
