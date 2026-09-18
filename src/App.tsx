import { useState } from 'react'
import { BookOpen, CheckCircle2, ChevronDown, CirclePlay, FileCode2, GitBranch, Layers3, Sparkles, TriangleAlert } from 'lucide-react'
import { CodeEditor } from './ui/components/CodeEditor'
import { TokenView } from './ui/components/TokenView'
import { ASTView } from './ui/components/ASTView'
import { SymbolTableView } from './ui/components/SymbolTableView'
import { IRView } from './ui/components/IRView'
import { OutputConsole } from './ui/components/OutputConsole'
import { ErrorPanel } from './ui/components/ErrorPanel'
import { useCompilerPipeline } from './ui/hooks/useCompilerPipeline'
import { samplePrograms } from './examples/samplePrograms'
import './App.css'

function App() {
  const [source, setSource] = useState(samplePrograms['Arithmetic intro'])
  const [selectedExample, setSelectedExample] = useState('Arithmetic intro')
  const result = useCompilerPipeline(source)
  const hasError = Boolean(result.error)

  return (
    <div className="app-shell">
      <header className="topbar"><div className="brand"><span className="brand-mark"><Sparkles size={16} /></span><span>LexiScope</span><span className="version">v0.1 playground</span></div><nav><a href="https://github.com/ariktadas144/LexiScope" target="_blank"><GitBranch size={15} /> Repository</a><a href="#language-spec"><BookOpen size={15} /> Language spec</a></nav></header>
      <section className="intro-row"><div><p className="eyebrow">Compiler workbench / 01</p><h1>See your language think.</h1><p className="subtitle">A transparent playground for Lexi, from source text to executable output.</p></div><div className="run-summary"><span className={hasError ? 'status-dot danger' : 'status-dot'}></span><span>{hasError ? 'Needs attention' : 'Pipeline healthy'}</span><span className="summary-divider" /><span>{result.tokens.filter((token) => token.kind !== 'eof').length} tokens</span></div></section>
      <main className="workspace-grid">
        <section className="panel editor-panel"><div className="panel-header"><div className="panel-title"><FileCode2 size={16} /><span>Source</span><span className="file-pill">main.lex</span></div><button className="run-button" type="button" onClick={() => setSource(source + '\n')}><CirclePlay size={15} /> Compile</button></div><div className="editor-toolbar"><label>Example <select value={selectedExample} onChange={(event) => { setSelectedExample(event.target.value); setSource(samplePrograms[event.target.value as keyof typeof samplePrograms]) }}><option>{Object.keys(samplePrograms)[0]}</option><option>{Object.keys(samplePrograms)[1]}</option></select><ChevronDown size={13} /></label><span>Lexi / UTF-8</span></div><CodeEditor value={source} onChange={setSource} /><ErrorPanel error={result.error} /></section>
        <section className="panel output-panel"><div className="panel-header"><div className="panel-title"><CirclePlay size={16} /><span>Output</span></div><span className="live-label"><span className="live-dot" /> live</span></div><OutputConsole output={result.output} /><div className="output-foot"><span>stdout</span><span>{result.output.length} lines</span></div></section>
        <section className="panel diagnostics-panel"><div className="panel-header"><div className="panel-title"><Layers3 size={16} /><span>Pipeline diagnostics</span></div><span className="stage-count">5 stages</span></div><div className="pipeline-steps">{['Lexical analysis', 'Syntax analysis', 'Semantic analysis', 'Three-address code', 'Interpretation'].map((step, index) => <div className="pipeline-step" key={step}><span className={index === 4 && hasError ? 'step-icon warning' : 'step-icon'}>{index === 4 && hasError ? <TriangleAlert size={14} /> : <CheckCircle2 size={14} />}</span><span>{step}</span><span className="step-meta">{index === 0 ? `${result.tokens.length - 1} tokens` : index === 1 ? (result.ast ? 'valid' : 'waiting') : index === 2 ? `${result.symbols.length} symbols` : index === 3 ? `${result.instructions.length} ops` : 'ready'}</span></div>)}</div></section>
        <section className="panel tokens-panel"><div className="panel-header"><div className="panel-title"><span className="section-number">01</span><span>Token stream</span></div><span className="count-badge">{result.tokens.length - 1}</span></div><TokenView tokens={result.tokens} /></section>
        <section className="panel ast-panel"><div className="panel-header"><div className="panel-title"><span className="section-number">02</span><span>Abstract syntax tree</span></div><span className="muted">JSON view</span></div><ASTView ast={result.ast} /></section>
        <section className="panel symbols-panel"><div className="panel-header"><div className="panel-title"><span className="section-number">03</span><span>Symbol table</span></div></div><SymbolTableView symbols={result.symbols} /></section>
        <section className="panel ir-panel"><div className="panel-header"><div className="panel-title"><span className="section-number">04</span><span>Three-address code</span></div><span className="muted">optimized</span></div><IRView instructions={result.instructions} /></section>
      </main>
      <footer><span>LexiScope compiler laboratory</span><span>Built for clarity at every stage <Sparkles size={13} /></span></footer>
    </div>
  )
}

export default App
