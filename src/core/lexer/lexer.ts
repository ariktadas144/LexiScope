import { keywords, type Token } from './token'

export function lex(source: string): Token[] {
  const tokens: Token[] = []; let index = 0; let line = 1; let column = 1
  const push = (kind: Token['kind'], lexeme: string, startLine = line, startColumn = column) => tokens.push({ kind, lexeme, line: startLine, column: startColumn })
  while (index < source.length) {
    const char = source[index]
    if (/\s/.test(char)) { if (char === '\n') { line++; column = 0 }; index++; column++; continue }
    const startLine = line; const startColumn = column
    if (char === '/' && source[index + 1] === '/') { const start = index; while (index < source.length && source[index] !== '\n') { index++; column++ }; push('comment', source.slice(start, index), startLine, startColumn); continue }
    if (/[A-Za-z_]/.test(char)) { const start = index; while (/[A-Za-z0-9_]/.test(source[index] ?? '')) { index++; column++ }; const word = source.slice(start, index); push(keywords.has(word) ? 'keyword' : 'identifier', word, startLine, startColumn); continue }
    if (/\d/.test(char)) { const start = index; while (/[\d.]/.test(source[index] ?? '')) { index++; column++ }; push('number', source.slice(start, index), startLine, startColumn); continue }
    if (char === '"') { const start = index++; column++; while (index < source.length && source[index] !== '"') { index++; column++ }; if (source[index] === '"') { index++; column++; push('string', source.slice(start, index), startLine, startColumn) } else push('error', 'Unterminated string', startLine, startColumn); continue }
    const two = source.slice(index, index + 2); if (['==', '!=', '<=', '>='].includes(two)) { push('operator', two, startLine, startColumn); index += 2; column += 2; continue }
    if ('+-*/%=<>!'.includes(char)) { push('operator', char, startLine, startColumn); index++; column++; continue }
    if ('();{},'.includes(char)) { push('punctuation', char, startLine, startColumn); index++; column++; continue }
    push('error', char, startLine, startColumn); index++; column++
  }
  push('eof', '', line, column); return tokens
}
