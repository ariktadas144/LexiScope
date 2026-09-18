export type TokenKind = 'keyword' | 'identifier' | 'number' | 'operator' | 'punctuation' | 'string' | 'comment' | 'eof' | 'error'

export interface Token { kind: TokenKind; lexeme: string; line: number; column: number }

export const keywords = new Set(['let', 'print', 'if', 'else', 'while', 'true', 'false'])
