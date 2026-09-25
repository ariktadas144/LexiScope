import { CompilerError } from '../errors/CompilerError'
import type { Instruction } from '../codegen/instruction'
import { evalBinary, evalUnary, formatValue, type Value } from '../semantics'

export const MAX_STEPS = 100_000
export const MAX_OUTPUT_LINES = 1_000

export interface ExecutionResult {
  output: string[]
  /** Final value of every variable, keyed by its unique name. */
  environment: Map<string, Value>
  /** Number of instructions executed (labels are free). */
  steps: number
  error?: CompilerError
}

const integerLiteral = /^-?\d+$/

/**
 * Executes three-address code. Execution never throws: a runtime error is
 * returned together with the output produced before it, and a step limit
 * stops non-terminating programs so live compilation can never hang the page.
 */
export function execute(instructions: Instruction[], maxSteps = MAX_STEPS): ExecutionResult {
  const environment = new Map<string, Value>()
  const output: string[] = []
  let steps = 0

  const labels = new Map<string, number>()
  instructions.forEach((ins, position) => {
    if (ins.op === 'label' && ins.arg1) labels.set(ins.arg1, position)
  })

  const read = (text: string | undefined, at: Instruction): Value => {
    if (text === undefined) throw new CompilerError('runtime', 'Internal error: missing operand', at.line, at.column)
    if (text.startsWith('"')) return text.slice(1, -1)
    if (text === 'true') return true
    if (text === 'false') return false
    if (integerLiteral.test(text)) return Number(text)
    const value = environment.get(text)
    if (value === undefined) throw new CompilerError('runtime', `Internal error: '${text}' has no value`, at.line, at.column)
    return value
  }

  const jump = (label: string | undefined, at: Instruction): number => {
    const target = label === undefined ? undefined : labels.get(label)
    if (target === undefined) throw new CompilerError('runtime', `Internal error: unknown label '${label}'`, at.line, at.column)
    return target
  }

  try {
    let pc = 0
    while (pc < instructions.length) {
      const ins = instructions[pc]
      if (ins.op !== 'label') {
        steps++
        if (steps > maxSteps) {
          throw new CompilerError(
            'runtime',
            `Execution stopped after ${maxSteps.toLocaleString('en-US')} steps (possible infinite loop)`,
            ins.line,
            ins.column,
          )
        }
      }
      switch (ins.op) {
        case 'label':
          break
        case 'assign':
          environment.set(ins.result as string, read(ins.arg1, ins))
          break
        case 'print':
          if (output.length >= MAX_OUTPUT_LINES) {
            throw new CompilerError('runtime', `Output limit of ${MAX_OUTPUT_LINES} lines exceeded`, ins.line, ins.column)
          }
          output.push(formatValue(read(ins.arg1, ins)))
          break
        case 'goto':
          pc = jump(ins.arg1, ins)
          break
        case 'ifFalse':
          if (read(ins.arg1, ins) === false) pc = jump(ins.arg2, ins)
          break
        case '!':
        case 'neg': {
          const result = evalUnary(ins.op, read(ins.arg1, ins))
          if (!result.ok) throw new CompilerError('runtime', result.message, ins.line, ins.column)
          environment.set(ins.result as string, result.value)
          break
        }
        default: {
          const result = evalBinary(ins.op, read(ins.arg1, ins), read(ins.arg2, ins))
          if (!result.ok) throw new CompilerError('runtime', result.message, ins.line, ins.column)
          environment.set(ins.result as string, result.value)
        }
      }
      pc++
    }
  } catch (error) {
    if (error instanceof CompilerError) return { output, environment, steps, error }
    throw error
  }
  return { output, environment, steps }
}
