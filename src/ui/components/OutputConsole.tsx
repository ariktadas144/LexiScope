export function OutputConsole({ output }: { output: string[] }) {
  if (output.length === 0) return <div className="console-output empty-hint">Run a program to see output</div>
  return (
    <div className="console-output">
      {output.map((line, index) => (
        <div key={index}>
          <span className="prompt">&gt;</span> {line === '' ? <span className="muted">(empty line)</span> : line}
        </div>
      ))}
    </div>
  )
}
