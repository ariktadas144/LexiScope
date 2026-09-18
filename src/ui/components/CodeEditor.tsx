interface Props { value: string; onChange: (value: string) => void }
export function CodeEditor({ value, onChange }: Props) { return <textarea className="code-editor" value={value} onChange={(event) => onChange(event.target.value)} spellCheck={false} aria-label="Source editor" /> }
