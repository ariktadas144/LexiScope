export type Expression = { type: 'literal'; value: number | boolean | string } | { type: 'identifier'; name: string } | { type: 'binary'; operator: string; left: Expression; right: Expression }
export type Statement = { type: 'declaration'; name: string; value: Expression } | { type: 'print'; value: Expression }
export interface Program { type: 'program'; body: Statement[] }
