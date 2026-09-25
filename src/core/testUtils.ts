import { generateTac } from './codegen/tacGenerator'
import { formatInstruction } from './codegen/instruction'
import { lex } from './lexer/lexer'
import { parse } from './parser/parser'
import { analyze } from './semantic/analyzer'
import type { Program } from './parser/ast'

/** Lex + parse (comments removed), for tests. */
export function parseSource(source: string): Program {
  return parse(lex(source).filter((token) => token.kind !== 'comment'))
}

/** Lex + parse + analyze, for tests. */
export function analyzedProgram(source: string): Program {
  const program = parseSource(source)
  analyze(program)
  return program
}

/** TAC of a source program as readable lines, for tests. */
export function tacLines(source: string): string[] {
  return generateTac(analyzedProgram(source)).map(formatInstruction)
}
