interface Props {
  error?: { stage: string; message: string; line: number; column: number }
}

export function ErrorPanel({ error }: Props) {
  if (!error) return null
  return (
    <div className="error-panel">
      <span className="error-badge">{error.stage}</span>
      <span>{error.message}</span>
      <span className="error-position">
        line {error.line}, col {error.column}
      </span>
    </div>
  )
}
