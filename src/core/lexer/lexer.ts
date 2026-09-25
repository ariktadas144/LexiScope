import {
  INT_MAX,
  keywords,
  oneCharOperators,
  punctuation,
  twoCharOperators,
  type Token,
} from './token'

const isDigit = (ch: string) => ch >= '0' && ch <= '9'
const isLetter = (ch: string) => (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'
const isWordChar = (ch: string) => isLetter(ch) || isDigit(ch)

/**
 * Hand-written scanner. It never throws: malformed input becomes an `error`
 * token (with a message) so the full token stream is always available to the UI.
 */
export function lex(source: string): Token[] {
  const tokens: Token[] = []
  let index = 0
  let line = 1
  let column = 1

  const peek = (offset = 0) => source[index + offset] ?? ''

  const advance = (): string => {
    const ch = source[index++]
    if (ch === '\n') {
      line++
      column = 1
    } else {
      column++
    }
    return ch
  }

  const push = (kind: Token['kind'], lexeme: string, startLine: number, startColumn: number, message?: string) => {
    const token: Token = { kind, lexeme, line: startLine, column: startColumn }
    if (message !== undefined) token.message = message
    tokens.push(token)
  }

  while (index < source.length) {
    const ch = peek()
    const startLine = line
    const startColumn = column

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      advance()
      continue
    }

    // Line comment
    if (ch === '/' && peek(1) === '/') {
      const start = index
      while (index < source.length && peek() !== '\n') advance()
      push('comment', source.slice(start, index), startLine, startColumn)
      continue
    }

    // Identifier or keyword
    if (isLetter(ch)) {
      const start = index
      while (isWordChar(peek())) advance()
      const word = source.slice(start, index)
      push(keywords.has(word) ? 'keyword' : 'identifier', word, startLine, startColumn)
      continue
    }

    // Integer literal
    if (isDigit(ch)) {
      const start = index
      while (isDigit(peek())) advance()
      if (peek() === '.' && isDigit(peek(1))) {
        advance()
        while (isDigit(peek())) advance()
        const text = source.slice(start, index)
        push('error', text, startLine, startColumn, `Decimal numbers are not supported ('${text}'); Lexi has only int`)
        continue
      }
      if (isLetter(peek())) {
        while (isWordChar(peek())) advance()
        const text = source.slice(start, index)
        push('error', text, startLine, startColumn, `Invalid number or identifier '${text}'`)
        continue
      }
      const text = source.slice(start, index)
      if (Number(text) > INT_MAX) {
        push('error', text, startLine, startColumn, `Integer literal '${text}' is out of range (max ${INT_MAX})`)
      } else {
        push('number', text, startLine, startColumn)
      }
      continue
    }

    // String literal (single line, no escapes)
    if (ch === '"') {
      const start = index
      advance()
      while (index < source.length && peek() !== '"' && peek() !== '\n') advance()
      if (peek() === '"') {
        advance()
        push('string', source.slice(start, index), startLine, startColumn)
      } else {
        push('error', source.slice(start, index), startLine, startColumn, 'Unterminated string literal (missing closing ")')
      }
      continue
    }

    // Operators
    const two = ch + peek(1)
    if (twoCharOperators.has(two)) {
      advance()
      advance()
      push('operator', two, startLine, startColumn)
      continue
    }
    if (oneCharOperators.has(ch)) {
      advance()
      push('operator', ch, startLine, startColumn)
      continue
    }
    if (ch === '&' || ch === '|') {
      advance()
      push('error', ch, startLine, startColumn, `Unexpected character '${ch}' (did you mean '${ch}${ch}'?)`)
      continue
    }

    // Punctuation
    if (punctuation.has(ch)) {
      advance()
      push('punctuation', ch, startLine, startColumn)
      continue
    }

    // Anything else is a lexical error. Consume a whole code point so that
    // characters outside the BMP are reported once, with a correct column.
    const codePoint = String.fromCodePoint(source.codePointAt(index) ?? 0xfffd)
    for (let i = 0; i < codePoint.length; i++) advance()
    column -= codePoint.length - 1
    push('error', codePoint, startLine, startColumn, `Unexpected character '${codePoint}'`)
  }

  push('eof', '', line, column)
  return tokens
}
