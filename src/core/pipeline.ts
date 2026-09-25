import { generateTac } from './codegen/tacGenerator'
import type { Instruction } from './codegen/instruction'
import { CompilerError, type ErrorStage } from './errors/CompilerError'
import { execute } from './interpreter/interpreter'
import { lex } from './lexer/lexer'
import type { Token } from './lexer/token'
import { foldProgram } from './optimizer/constantFolding'
import type { Program } from './parser/ast'
import { parse } from './parser/parser'
import { analyze } from './semantic/analyzer'
import { SymbolTable, type SymbolEntry } from './semantic/symbolTable'
import { formatValue } from './semantics'

export type StageName = 'lexical' | 'syntax' | 'semantic' | 'codegen' | 'execution'
export type StageStatus = 'ok' | 'error' | 'skipped'

export interface StageReport {
  name: StageName
  label: string
  status: StageStatus
  detail: string
}

export interface PipelineError {
  stage: ErrorStage
  message: string
  line: number
  column: number
}

export interface PipelineResult {
  /** Every token, including comments, error tokens and the final `eof`. */
  tokens: Token[]
  /** Present once parsing succeeded (annotated after semantic analysis). */
  ast?: Program
  /** Symbols declared so far; kept even when a later phase fails. */
  symbols: SymbolEntry[]
  /** Three-address code before constant folding. */
  unoptimized: Instruction[]
  /** Three-address code after constant folding; this is what is executed. */
  instructions: Instruction[]
  output: string[]
  steps: number
  stages: StageReport[]
  /** The first error found. Earlier phases' results above stay available. */
  error?: PipelineError
}

const stageLabels: Record<StageName, string> = {
  lexical: 'Lexical analysis',
  syntax: 'Syntax analysis',
  semantic: 'Semantic analysis',
  codegen: 'Three-address code',
  execution: 'Execution',
}
const stageOrder: StageName[] = ['lexical', 'syntax', 'semantic', 'codegen', 'execution']

/** Runs one phase and turns any unexpected exception into a phase-tagged error. */
function guard<T>(stage: ErrorStage, phase: () => T): T {
  try {
    return phase()
  } catch (error) {
    if (error instanceof CompilerError) throw error
    if (error instanceof RangeError) {
      throw new CompilerError(stage, 'The program is too deeply nested to be processed')
    }
    throw new CompilerError(stage, `Internal compiler error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/** Runs the whole pipeline: lex -> parse -> analyze -> TAC (+ folding) -> execute. */
export function compile(source: string): PipelineResult {
  const reports = new Map<StageName, { status: StageStatus; detail: string }>()
  const finish = (result: Omit<PipelineResult, 'stages'>): PipelineResult => ({
    ...result,
    stages: stageOrder.map((name) => ({
      name,
      label: stageLabels[name],
      status: reports.get(name)?.status ?? 'skipped',
      detail: reports.get(name)?.detail ?? 'not reached',
    })),
  })
  const fail = (stage: StageName, error: CompilerError) => {
    reports.set(stage, { status: 'error', detail: error.stage === 'runtime' ? 'runtime error' : `${error.stage} error` })
    return { stage: error.stage, message: error.message, line: error.line, column: error.column } satisfies PipelineError
  }

  let tokens: Token[] = []
  let ast: Program | undefined
  const table = new SymbolTable()
  let unoptimized: Instruction[] = []
  let instructions: Instruction[] = []
  const partial = () => ({ tokens, ast, symbols: table.all(), unoptimized, instructions, output: [], steps: 0 })

  let current: StageName = 'lexical'
  try {
    // 1. Lexical analysis
    tokens = guard('lexical', () => lex(source))
    const lexicalError = tokens.find((token) => token.kind === 'error')
    if (lexicalError) {
      const error = new CompilerError('lexical', lexicalError.message ?? 'Invalid token', lexicalError.line, lexicalError.column)
      return finish({ ...partial(), error: fail('lexical', error) })
    }
    reports.set('lexical', { status: 'ok', detail: `${tokens.filter((t) => t.kind !== 'eof' && t.kind !== 'comment').length} tokens` })

    // 2. Syntax analysis
    current = 'syntax'
    const significant = tokens.filter((token) => token.kind !== 'comment')
    ast = guard('syntax', () => parse(significant))
    reports.set('syntax', { status: 'ok', detail: `${ast.body.length} top-level statements` })

    // 3. Semantic analysis (annotates the AST, fills the symbol table)
    current = 'semantic'
    guard('semantic', () => analyze(ast as Program, table))
    reports.set('semantic', { status: 'ok', detail: `${table.all().length} symbols` })

    // 4. Code generation, with and without constant folding
    current = 'codegen'
    const analyzed = ast
    guard('semantic', () => {
      unoptimized = generateTac(analyzed)
      instructions = generateTac(foldProgram(analyzed))
    })
    reports.set('codegen', { status: 'ok', detail: `${instructions.length} instructions (${unoptimized.length} before folding)` })
  } catch (error) {
    return finish({ ...partial(), error: fail(current, error as CompilerError) })
  }

  // 5. Execution of the (optimized) three-address code
  const run = execute(instructions)
  const symbols = table.all().map((entry) => {
    const value = run.environment.get(entry.uniqueName)
    return value === undefined ? entry : { ...entry, value: formatValue(value) }
  })
  const result = { tokens, ast, symbols, unoptimized, instructions, output: run.output, steps: run.steps }
  if (run.error) return finish({ ...result, error: fail('execution', run.error) })
  reports.set('execution', { status: 'ok', detail: `${run.steps} steps` })
  return finish(result)
}
