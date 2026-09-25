export type TokenKind =
  | 'keyword'
  | 'identifier'
  | 'number'
  | 'string'
  | 'operator'
  | 'punctuation'
  | 'comment'
  | 'eof'
  | 'error'

export interface Token {
  kind: TokenKind
  lexeme: string
  /** 1-based line of the first character of the token. */
  line: number
  /** 1-based column of the first character of the token. */
  column: number
  /** Human-readable explanation, present only on `error` tokens. */
  message?: string
}

export const typeKeywords = new Set(['int', 'boolean', 'string'])

export const keywords = new Set([
  'let',
  'int',
  'boolean',
  'string',
  'print',
  'if',
  'else',
  'while',
  'true',
  'false',
])

export const twoCharOperators = new Set(['==', '!=', '<=', '>=', '&&', '||'])
export const oneCharOperators = new Set(['+', '-', '*', '/', '%', '=', '<', '>', '!'])
export const punctuation = new Set(['(', ')', '{', '}', ';'])

/** Largest and smallest value of the Lexi `int` type (32-bit signed). */
export const INT_MAX = 2147483647
export const INT_MIN = -2147483648
