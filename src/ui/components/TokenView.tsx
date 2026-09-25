import type { Token } from '../../core/lexer/token'

interface Props {
  tokens: Token[]
}

/** Chips for every token except the final `eof` marker. Comments and errors get their own styling. */
export function TokenView({ tokens }: Props) {
  const visible = tokens.filter((token) => token.kind !== 'eof')
  if (visible.length === 0) return <div className="token-list empty-hint">No tokens yet — type a program above.</div>
  return (
    <div className="token-list">
      {visible.map((token, index) => (
        <span
          className={`token token-${token.kind}`}
          key={`${token.line}-${token.column}-${index}`}
          title={`${token.kind} · line ${token.line}, col ${token.column}${token.message ? ` · ${token.message}` : ''}`}
        >
          {token.kind === 'string' || token.kind === 'comment' ? token.lexeme : token.lexeme || '·'}
        </span>
      ))}
    </div>
  )
}
