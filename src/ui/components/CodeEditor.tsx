import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { HighlightStyle, StreamLanguage, bracketMatching, syntaxHighlighting } from '@codemirror/language'
import { lintGutter, setDiagnostics } from '@codemirror/lint'
import { tags } from '@lezer/highlight'
import { keywords, typeKeywords } from '../../core/lexer/token'

export interface EditorError {
  stage: string
  message: string
  line: number
  column: number
}

interface Props {
  value: string
  onChange: (value: string) => void
  error?: EditorError
}

/** Syntax highlighting for Lexi, built on CodeMirror's stream parser. */
const lexiLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null
    if (stream.match('//')) {
      stream.skipToEnd()
      return 'comment'
    }
    if (stream.match(/^"[^"\n]*"?/)) return 'string'
    if (stream.match(/^\d+(\.\d+)?/)) return 'number'
    if (stream.match(/^[A-Za-z_][A-Za-z0-9_]*/)) {
      const word = stream.current()
      if (word === 'true' || word === 'false') return 'atom'
      if (typeKeywords.has(word)) return 'typeName'
      return keywords.has(word) ? 'keyword' : 'variableName'
    }
    if (stream.match(/^(==|!=|<=|>=|&&|\|\|)/) || stream.match(/^[+\-*/%=<>!]/)) return 'operator'
    stream.next()
    return null
  },
})

const lexiHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#a45d3d', fontWeight: '500' },
  { tag: tags.typeName, color: '#a45d3d' },
  { tag: tags.number, color: '#6a72aa' },
  { tag: tags.atom, color: '#6a72aa' },
  { tag: tags.string, color: '#3b7f5f' },
  { tag: tags.comment, color: '#9aa69c', fontStyle: 'italic' },
  { tag: tags.operator, color: '#337b66' },
])

const theme = EditorView.theme({
  '&': { height: '100%', fontSize: '14px', backgroundColor: '#f8faf5', color: '#27372d' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: "'DM Mono', ui-monospace, monospace", lineHeight: '1.75', overflow: 'auto' },
  '.cm-content': { padding: '14px 0', caretColor: '#244f3a' },
  '.cm-gutters': { backgroundColor: '#f1f4ee', color: '#a0aaa1', border: 'none', borderRight: '1px solid #e7ebe4' },
  '.cm-activeLine': { backgroundColor: 'rgba(120, 160, 130, 0.08)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(120, 160, 130, 0.14)', color: '#5d7565' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: '#cde6d4' },
})

/** Turns a 1-based line/column into a document range that covers the offending token. */
function errorRange(state: EditorState, error: EditorError): { from: number; to: number } {
  const line = state.doc.line(Math.min(Math.max(error.line, 1), state.doc.lines))
  const offset = Math.min(Math.max(error.column - 1, 0), line.length)
  const rest = line.text.slice(offset)
  const token = /^(?:[A-Za-z0-9_]+|"[^"]*"?|==|!=|<=|>=|&&|\|\||.)/.exec(rest)
  if (token) return { from: line.from + offset, to: line.from + offset + token[0].length }
  // The error is at the end of the line (for example a missing ';'): mark the last character.
  const from = Math.max(line.from, line.to - 1)
  return { from, to: Math.max(line.to, from) }
}

export function CodeEditor({ value, onChange, error }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Create the editor once.
  useEffect(() => {
    if (!host.current) return
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          bracketMatching(),
          lintGutter(),
          lexiLanguage,
          syntaxHighlighting(lexiHighlight),
          keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
          theme,
          EditorView.contentAttributes.of({ 'aria-label': 'Source editor' }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString())
          }),
        ],
      }),
    })
    view.current = editor
    return () => {
      editor.destroy()
      view.current = null
    }
    // The editor is created once; later changes are synchronised by the effects below.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [])

  // Load a new document when the parent replaces the text (for example, a sample program).
  useEffect(() => {
    const editor = view.current
    if (!editor || editor.state.doc.toString() === value) return
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } })
  }, [value])

  // Show the current error as an underline and a gutter marker.
  useEffect(() => {
    const editor = view.current
    if (!editor) return
    const diagnostics = error
      ? [{ ...errorRange(editor.state, error), severity: 'error' as const, message: `${error.stage}: ${error.message}` }]
      : []
    editor.dispatch(setDiagnostics(editor.state, diagnostics))
  }, [error])

  return <div className="code-editor" ref={host} />
}
