import { useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, CirclePlay, FileCode2, GitBranch, Layers3, TriangleAlert } from 'lucide-react'
import { CodeEditor } from './ui/components/CodeEditor'
import { TokenView } from './ui/components/TokenView'
import { ASTView } from './ui/components/ASTView'
import { SymbolTableView } from './ui/components/SymbolTableView'
import { IRView } from './ui/components/IRView'
import { OutputConsole } from './ui/components/OutputConsole'
import { ErrorPanel } from './ui/components/ErrorPanel'
import { useCompilerPipeline } from './ui/hooks/useCompilerPipeline'
import { samplePrograms } from './examples/samplePrograms'
import type { StageStatus } from './core/pipeline'
import './App.css'

const DEFAULT_EXAMPLE = 'Arithmetic intro'

function App() {
  const initial = samplePrograms.find((p) => p.name === DEFAULT_EXAMPLE) ?? samplePrograms[0]
  const [source, setSource] = useState(initial.source)
  const [selectedExample, setSelectedExample] = useState(initial.name)
  const { result, pending } = useCompilerPipeline(source)
  const hasError = Boolean(result.error)
  const groups = useMemo(() => Array.from(new Set(samplePrograms.map((p) => p.group))), [])

  const onSelectExample = (name: string) => {
    const program = samplePrograms.find((p) => p.name === name)
    if (!program) return
    setSelectedExample(name)
    setSource(program.source)
  }

  const stageIcon = (status: StageStatus) => {
    if (status === 'error') return <TriangleAlert size={14} />
    if (status === 'skipped') return <span className="step-dot" />
    return <CheckCircle2 size={14} />
  }

  const significantTokens = result.tokens.filter((t) => t.kind !== 'eof' && t.kind !== 'comment').length

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">LexiScope</div>
        <nav>
          <a href="https://github.com/ariktadas144/LexiScope" target="_blank" rel="noreferrer">
            <GitBranch size={15} /> Repository
          </a>
        </nav>
      </header>

      <section className="intro-row">
        <div>
          <h1>See your language think.</h1>
          <p className="subtitle">A transparent playground for Lexi, from source text to executable output.</p>
        </div>
        <div className="run-summary">
          <span className={hasError ? 'status-dot danger' : 'status-dot'} />
          <span>{pending ? 'Compiling…' : hasError ? 'Needs attention' : 'Pipeline healthy'}</span>
          <span className="summary-divider" />
          <span>{significantTokens} tokens</span>
        </div>
      </section>

      <main className="workspace-grid">
        <section className="panel editor-panel">
          <div className="panel-header">
            <div className="panel-title">
              <FileCode2 size={16} />
              <span>Source</span>
              <span className="file-pill">main.lex</span>
            </div>
            <button className="run-button" type="button" title="LexiScope compiles on every keystroke; this reruns the pipeline">
              <CirclePlay size={15} /> Compile
            </button>
          </div>
          <div className="editor-toolbar">
            <label>
              Example
              <select value={selectedExample} onChange={(event) => onSelectExample(event.target.value)}>
                {groups.map((group) => (
                  <optgroup label={group} key={group}>
                    {samplePrograms
                      .filter((p) => p.group === group)
                      .map((program) => (
                        <option key={program.name} value={program.name}>
                          {program.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown size={13} />
            </label>
            <span>Lexi / UTF-8</span>
          </div>
          <CodeEditor value={source} onChange={setSource} error={result.error} />
          <ErrorPanel error={result.error} />
        </section>

        <section className="panel output-panel">
          <div className="panel-header">
            <div className="panel-title">
              <CirclePlay size={16} />
              <span>Output</span>
            </div>
            <span className="live-label">
              <span className="live-dot" /> live
            </span>
          </div>
          <OutputConsole output={result.output} />
          <div className="output-foot">
            <span>stdout</span>
            <span>{result.output.length} lines</span>
          </div>
        </section>

        <section className="panel diagnostics-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Layers3 size={16} />
              <span>Pipeline diagnostics</span>
            </div>
            <span className="stage-count">5 stages</span>
          </div>
          <div className="pipeline-steps">
            {result.stages.map((stage) => (
              <div className="pipeline-step" key={stage.name}>
                <span className={stage.status === 'error' ? 'step-icon warning' : stage.status === 'skipped' ? 'step-icon idle' : 'step-icon'}>
                  {stageIcon(stage.status)}
                </span>
                <span>{stage.label}</span>
                <span className="step-meta">{stage.detail}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel tokens-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="section-number">01</span>
              <span>Token stream</span>
            </div>
            <span className="count-badge">{significantTokens}</span>
          </div>
          <TokenView tokens={result.tokens} />
        </section>

        <section className="panel ast-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="section-number">02</span>
              <span>Abstract syntax tree</span>
            </div>
            <span className="muted">click to expand</span>
          </div>
          <ASTView ast={result.ast} />
        </section>

        <section className="panel symbols-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="section-number">03</span>
              <span>Symbol table</span>
            </div>
            <span className="count-badge">{result.symbols.length}</span>
          </div>
          <SymbolTableView symbols={result.symbols} />
        </section>

        <section className="panel ir-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="section-number">04</span>
              <span>Three-address code</span>
            </div>
          </div>
          <IRView instructions={result.instructions} unoptimized={result.unoptimized} />
        </section>
      </main>
    </div>
  )
}

export default App
