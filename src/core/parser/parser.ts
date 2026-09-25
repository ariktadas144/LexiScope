import { CompilerError } from '../errors/CompilerError'
import { typeKeywords, type Token } from '../lexer/token'
import type {
  AssignmentStatement,
  BinaryOperator,
  BlockStatement,
  DeclarationStatement,
  Expression,
  IfStatement,
  PrintStatement,
  Program,
  Statement,
  UnaryOperator,
  ValueType,
  WhileStatement,
} from './ast'

/**
 * Recursive-descent parser: one method per grammar rule (see docs/grammar.ebnf).
 * Operator precedence is encoded in the call chain, lowest binding first:
 * or -> and -> equality -> comparison -> additive -> term -> unary -> primary.
 * Comment tokens must be removed before parsing (the pipeline does this).
 */
class Parser {
  private index = 0
  private readonly tokens: Token[]

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  parseProgram(): Program {
    const body: Statement[] = []
    while (this.peek().kind !== 'eof') body.push(this.statement())
    return { type: 'program', body }
  }

  // ---- helpers -----------------------------------------------------------

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.index + offset, this.tokens.length - 1)]
  }

  private next(): Token {
    const token = this.peek()
    if (token.kind !== 'eof') this.index++
    return token
  }

  private check(lexeme: string): boolean {
    const token = this.peek()
    return token.kind !== 'eof' && token.kind !== 'string' && token.lexeme === lexeme
  }

  private match(lexeme: string): boolean {
    if (!this.check(lexeme)) return false
    this.index++
    return true
  }

  private describe(token: Token): string {
    return token.kind === 'eof' ? 'end of file' : `'${token.lexeme}'`
  }

  private expect(lexeme: string, context = ''): Token {
    if (this.check(lexeme)) return this.next()
    const found = this.peek()
    const message = `Expected '${lexeme}'${context} but found ${this.describe(found)}`
    // A missing ';' is reported where the statement ended, not on the next line.
    if (lexeme === ';' && this.index > 0) {
      const previous = this.tokens[this.index - 1]
      throw new CompilerError('syntax', message, previous.line, previous.column + previous.lexeme.length)
    }
    throw new CompilerError('syntax', message, found.line, found.column)
  }

  private expectIdentifier(context: string): Token {
    const token = this.peek()
    if (token.kind === 'identifier') return this.next()
    throw new CompilerError('syntax', `Expected an identifier${context} but found ${this.describe(token)}`, token.line, token.column)
  }

  // ---- statements --------------------------------------------------------

  private statement(): Statement {
    const token = this.peek()

    if (token.kind === 'keyword') {
      if (token.lexeme === 'let' || typeKeywords.has(token.lexeme)) return this.declaration()
      if (token.lexeme === 'print') return this.printStatement()
      if (token.lexeme === 'if') return this.ifStatement()
      if (token.lexeme === 'while') return this.whileStatement()
      if (token.lexeme === 'else') {
        throw new CompilerError('syntax', "'else' without a matching 'if'", token.line, token.column)
      }
    }
    if (token.kind === 'punctuation' && token.lexeme === '{') return this.block()
    if (token.kind === 'identifier') return this.assignment()

    throw new CompilerError('syntax', `Unexpected ${this.describe(token)}; expected a statement`, token.line, token.column)
  }

  private declaration(): DeclarationStatement {
    const keyword = this.next()
    const declaredType: ValueType | null = keyword.lexeme === 'let' ? null : (keyword.lexeme as ValueType)
    const name = this.expectIdentifier(` after '${keyword.lexeme}'`)
    this.expect('=', ` after '${name.lexeme}'`)
    const value = this.expression()
    this.expect(';')
    return { type: 'declaration', declaredType, name: name.lexeme, value, line: keyword.line, column: keyword.column }
  }

  private assignment(): AssignmentStatement {
    const name = this.next()
    this.expect('=', ` after '${name.lexeme}'`)
    const value = this.expression()
    this.expect(';')
    return { type: 'assignment', name: name.lexeme, value, line: name.line, column: name.column }
  }

  private printStatement(): PrintStatement {
    const keyword = this.next()
    const value = this.expression()
    this.expect(';')
    return { type: 'print', value, line: keyword.line, column: keyword.column }
  }

  private block(): BlockStatement {
    const open = this.expect('{')
    const body: Statement[] = []
    while (!this.check('}')) {
      if (this.peek().kind === 'eof') this.expect('}', " to close the block opened at line " + open.line)
      body.push(this.statement())
    }
    this.expect('}')
    return { type: 'block', body, line: open.line, column: open.column }
  }

  private ifStatement(): IfStatement {
    const keyword = this.next()
    this.expect('(', " after 'if'")
    const condition = this.expression()
    this.expect(')', ' after the condition')
    const thenBranch = this.block()
    let elseBranch: BlockStatement | IfStatement | undefined
    if (this.match('else')) {
      elseBranch = this.check('if') ? this.ifStatement() : this.block()
    }
    const node: IfStatement = { type: 'if', condition, thenBranch, line: keyword.line, column: keyword.column }
    if (elseBranch) node.elseBranch = elseBranch
    return node
  }

  private whileStatement(): WhileStatement {
    const keyword = this.next()
    this.expect('(', " after 'while'")
    const condition = this.expression()
    this.expect(')', ' after the condition')
    const body = this.block()
    return { type: 'while', condition, body, line: keyword.line, column: keyword.column }
  }

  // ---- expressions -------------------------------------------------------

  private expression(): Expression {
    return this.binaryLevel(0)
  }

  private static readonly levels: BinaryOperator[][] = [
    ['||'],
    ['&&'],
    ['==', '!='],
    ['<', '>', '<=', '>='],
    ['+', '-'],
    ['*', '/', '%'],
  ]

  /** All binary levels are left-associative: a - b - c parses as (a - b) - c. */
  private binaryLevel(level: number): Expression {
    if (level >= Parser.levels.length) return this.unary()
    let left = this.binaryLevel(level + 1)
    for (;;) {
      const token = this.peek()
      const operator = Parser.levels[level].find((op) => token.kind === 'operator' && token.lexeme === op)
      if (!operator) return left
      this.next()
      const right = this.binaryLevel(level + 1)
      left = { type: 'binary', operator, left, right, line: token.line, column: token.column }
    }
  }

  private unary(): Expression {
    const token = this.peek()
    if (token.kind === 'operator' && (token.lexeme === '!' || token.lexeme === '-')) {
      this.next()
      const operand = this.unary()
      return { type: 'unary', operator: token.lexeme as UnaryOperator, operand, line: token.line, column: token.column }
    }
    return this.primary()
  }

  private primary(): Expression {
    const token = this.peek()
    if (token.kind === 'number') {
      this.next()
      return { type: 'literal', value: Number(token.lexeme), line: token.line, column: token.column }
    }
    if (token.kind === 'string') {
      this.next()
      return { type: 'literal', value: token.lexeme.slice(1, -1), line: token.line, column: token.column }
    }
    if (token.kind === 'keyword' && (token.lexeme === 'true' || token.lexeme === 'false')) {
      this.next()
      return { type: 'literal', value: token.lexeme === 'true', line: token.line, column: token.column }
    }
    if (token.kind === 'identifier') {
      this.next()
      return { type: 'identifier', name: token.lexeme, line: token.line, column: token.column }
    }
    if (token.kind === 'punctuation' && token.lexeme === '(') {
      this.next()
      const inner = this.expression()
      this.expect(')', ' to close the parenthesis')
      return inner
    }
    throw new CompilerError('syntax', `Expected an expression but found ${this.describe(token)}`, token.line, token.column)
  }
}

export function parse(tokens: Token[]): Program {
  return new Parser(tokens).parseProgram()
}
