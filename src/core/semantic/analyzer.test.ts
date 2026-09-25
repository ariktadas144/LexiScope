import { describe, expect, it } from 'vitest'
import { CompilerError } from '../errors/CompilerError'
import { parseSource } from '../testUtils'
import { analyze } from './analyzer'
import { SymbolTable } from './symbolTable'

const symbolsOf = (source: string) => analyze(parseSource(source)).all()

const semanticError = (source: string): CompilerError => {
  try {
    analyze(parseSource(source))
  } catch (error) {
    if (error instanceof CompilerError) return error
    throw error
  }
  throw new Error('expected a semantic error for: ' + source)
}

describe('semantic analyzer: symbols and types', () => {
  it('records declared symbols with type, scope and position', () => {
    expect(symbolsOf('let value = 4;')[0]).toMatchObject({ name: 'value', type: 'int', scope: 'global', depth: 0, line: 1, column: 1 })
  })

  it('infers types for let and honours explicit types', () => {
    const symbols = symbolsOf('let a = 1; let b = true; let c = "s"; int d = 2; boolean e = false; string f = "x";')
    expect(symbols.map((s) => s.type)).toEqual(['int', 'boolean', 'string', 'int', 'boolean', 'string'])
  })

  it('types an expression from its operands', () => {
    expect(symbolsOf('let a = 1 < 2; let b = 1 + 2; let c = 1 == 1 && true;').map((s) => s.type)).toEqual(['boolean', 'int', 'boolean'])
  })

  it('annotates the AST with types and unique names', () => {
    const program = parseSource('int x = 1; print x + 2;')
    analyze(program)
    const print = program.body[1]
    if (print.type !== 'print' || print.value.type !== 'binary') throw new Error('unexpected shape')
    expect(print.value.valueType).toBe('int')
    expect(print.value.left).toMatchObject({ type: 'identifier', uniqueName: 'x', valueType: 'int' })
  })
})

describe('semantic analyzer: scopes', () => {
  it('opens a new scope for every block', () => {
    const symbols = symbolsOf('let a = 1; { let b = 2; { let c = 3; } }')
    expect(symbols.map((s) => `${s.name}:${s.scope}:${s.depth}`)).toEqual(['a:global:0', 'b:block 1:1', 'c:block 2:2'])
  })

  it('lets inner scopes read outer variables', () => {
    expect(() => symbolsOf('let a = 1; { print a; }')).not.toThrow()
  })

  it('does not let a variable escape its block', () => {
    expect(semanticError('{ let a = 1; } print a;').message).toContain("Unknown identifier 'a'")
  })

  it('allows shadowing and gives the inner variable a unique name', () => {
    const symbols = symbolsOf('let x = 1; { let x = 2; }')
    expect(symbols.map((s) => s.uniqueName)).toEqual(['x', 'x.2'])
  })

  it('resolves identifiers to the innermost declaration', () => {
    const program = parseSource('let x = 1; { let x = 2; print x; } print x;')
    analyze(program)
    const block = program.body[1]
    if (block.type !== 'block') throw new Error('expected block')
    const inner = block.body[1]
    const outer = program.body[2]
    if (inner.type !== 'print' || outer.type !== 'print') throw new Error('unexpected shape')
    expect(inner.value).toMatchObject({ uniqueName: 'x.2' })
    expect(outer.value).toMatchObject({ uniqueName: 'x' })
  })

  it('scopes if and while bodies', () => {
    expect(semanticError('if (true) { let a = 1; } print a;').message).toContain("Unknown identifier 'a'")
    expect(semanticError('while (false) { let a = 1; } print a;').message).toContain("Unknown identifier 'a'")
  })

  it('never lets a user variable take a temporary name', () => {
    expect(symbolsOf('let t1 = 1;')[0].uniqueName).toBe('t1.1')
  })
})

describe('semantic analyzer: errors', () => {
  it('reports an undeclared identifier with its position', () => {
    const error = semanticError('let a = 1;\nprint missing;')
    expect(error.stage).toBe('semantic')
    expect(error.message).toContain("Unknown identifier 'missing'")
    expect([error.line, error.column]).toEqual([2, 7])
  })

  it('does not allow a variable in its own initializer', () => {
    expect(semanticError('let a = a + 1;').message).toContain("Unknown identifier 'a'")
  })

  it('reports redeclaration in the same scope', () => {
    const error = semanticError('let a = 1;\nlet a = 2;')
    expect(error.message).toContain("'a' is already declared in this scope (line 1)")
    expect(error.line).toBe(2)
  })

  it('reports a declared-type mismatch', () => {
    expect(semanticError('int a = true;').message).toBe("Cannot initialize 'a' of type int with a boolean value")
    expect(semanticError('boolean b = 1;').message).toContain('boolean')
    expect(semanticError('string s = 1;').message).toContain('string')
  })

  it('checks assignments', () => {
    expect(semanticError('x = 1;').message).toContain("Unknown identifier 'x'")
    expect(semanticError('let x = 1; x = true;').message).toBe("Cannot assign a boolean value to 'x' of type int")
    expect(() => symbolsOf('let x = 1; x = x + 1;')).not.toThrow()
  })

  it('checks operator operand types', () => {
    expect(semanticError('let a = true; print a + 1;').message).toBe("Operator '+' expects int operands but found boolean and int")
    expect(semanticError('print 1 < true;').message).toContain("Operator '<'")
    expect(semanticError('print 1 && 2;').message).toContain('boolean operands')
    expect(semanticError('print !1;').message).toBe("Operator '!' expects a boolean operand but found int")
    expect(semanticError('print -true;').message).toBe("Operator '-' expects an int operand but found boolean")
    expect(semanticError('print "a" + "b";').message).toContain('int operands')
  })

  it('checks equality operand types', () => {
    expect(semanticError('print 1 == true;').message).toBe("Operator '==' cannot compare int with boolean")
    expect(() => symbolsOf('print true != false; print "a" == "b"; print 1 == 2;')).not.toThrow()
  })

  it('requires boolean conditions', () => {
    expect(semanticError('if (1) { }').message).toBe("The condition of 'if' must be boolean but found int")
    expect(semanticError('while (1 + 1) { }').message).toContain("'while'")
  })

  it('keeps the symbols found before the error', () => {
    const table = new SymbolTable()
    try {
      analyze(parseSource('let a = 1; let b = 2; print c;'), table)
    } catch {
      /* expected */
    }
    expect(table.all().map((s) => s.name)).toEqual(['a', 'b'])
  })
})
