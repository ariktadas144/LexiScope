export type ErrorStage = 'lexical' | 'syntax' | 'semantic' | 'runtime'
export class CompilerError extends Error {
	stage: ErrorStage
	line: number
	column: number
	constructor(stage: ErrorStage, message: string, line = 1, column = 1) { super(message); this.name = 'CompilerError'; this.stage = stage; this.line = line; this.column = column }
}
