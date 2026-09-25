export type Opcode =
  | 'assign' // result = arg1
  | '+' | '-' | '*' | '/' | '%' // result = arg1 op arg2
  | '<' | '>' | '<=' | '>=' | '==' | '!='
  | '!' // result = ! arg1
  | 'neg' // result = - arg1
  | 'print' // print arg1
  | 'label' // arg1:
  | 'goto' // goto arg1
  | 'ifFalse' // ifFalse arg1 goto arg2

/** One quadruple of three-address code (operator, two arguments, result). */
export interface Instruction {
  /** 1-based position in the instruction list. */
  index: number
  op: Opcode
  arg1?: string
  arg2?: string
  result?: string
  /** Source position, used to report runtime errors. */
  line?: number
  column?: number
}

/** Human-readable form, e.g. `t1 = x + 5`, `ifFalse t2 goto L1`, `L1:`. */
export function formatInstruction(ins: Instruction): string {
  switch (ins.op) {
    case 'assign':
      return `${ins.result} = ${ins.arg1}`
    case 'neg':
      return `${ins.result} = -${ins.arg1}`
    case '!':
      return `${ins.result} = !${ins.arg1}`
    case 'print':
      return `print ${ins.arg1}`
    case 'label':
      return `${ins.arg1}:`
    case 'goto':
      return `goto ${ins.arg1}`
    case 'ifFalse':
      return `ifFalse ${ins.arg1} goto ${ins.arg2}`
    default:
      return `${ins.result} = ${ins.arg1} ${ins.op} ${ins.arg2}`
  }
}
