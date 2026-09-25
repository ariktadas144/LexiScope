import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Expression, Program, Statement } from '../../core/parser/ast'

type Node = Statement | Expression | Program

/** One label line for a node, without recursing into its children. */
function summarize(node: Node): string {
  switch (node.type) {
    case 'program':
      return 'Program'
    case 'declaration':
      return `Declaration ${node.name}${node.declaredType ? `: ${node.declaredType}` : ''}`
    case 'assignment':
      return `Assignment ${node.name}`
    case 'print':
      return 'Print'
    case 'block':
      return 'Block'
    case 'if':
      return 'If'
    case 'while':
      return 'While'
    case 'literal':
      return `Literal ${typeof node.value === 'string' ? `"${node.value}"` : String(node.value)}`
    case 'identifier':
      return `Identifier ${node.name}`
    case 'unary':
      return `Unary ${node.operator}`
    case 'binary':
      return `Binary ${node.operator}`
  }
}

/** Child nodes of `node`, each labelled with its role (for example "condition", "then"). */
function children(node: Node): { label: string; node: Node }[] {
  switch (node.type) {
    case 'program':
      return node.body.map((statement, i) => ({ label: `[${i}]`, node: statement }))
    case 'block':
      return node.body.map((statement, i) => ({ label: `[${i}]`, node: statement }))
    case 'declaration':
    case 'assignment':
      return [{ label: 'value', node: node.value }]
    case 'print':
      return [{ label: 'value', node: node.value }]
    case 'if': {
      const out = [
        { label: 'condition', node: node.condition },
        { label: 'then', node: node.thenBranch as Node },
      ]
      if (node.elseBranch) out.push({ label: 'else', node: node.elseBranch as Node })
      return out
    }
    case 'while':
      return [
        { label: 'condition', node: node.condition },
        { label: 'body', node: node.body as Node },
      ]
    case 'unary':
      return [{ label: 'operand', node: node.operand }]
    case 'binary':
      return [
        { label: 'left', node: node.left },
        { label: 'right', node: node.right },
      ]
    case 'literal':
    case 'identifier':
      return []
  }
}

function TreeNode({ label, node, depth }: { label: string; node: Node; depth: number }) {
  const kids = children(node)
  const [open, setOpen] = useState(depth < 3)
  const valueType = 'valueType' in node ? node.valueType : undefined

  return (
    <div className="ast-node" style={{ '--depth': depth } as React.CSSProperties}>
      <div className={`ast-row${kids.length ? ' has-children' : ''}`} onClick={kids.length ? () => setOpen((v) => !v) : undefined}>
        {kids.length > 0 && <ChevronRight size={12} className={`ast-caret${open ? ' open' : ''}`} />}
        {label && <span className="ast-label">{label}:</span>}
        <span className="ast-summary">{summarize(node)}</span>
        {valueType && <span className="ast-type">{valueType}</span>}
      </div>
      {kids.length > 0 && open && (
        <div className="ast-children">
          {kids.map((child, i) => (
            <TreeNode key={i} label={child.label} node={child.node} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ASTView({ ast }: { ast?: Program }) {
  if (!ast) return <div className="tree-view empty-hint">The AST appears after the program parses successfully.</div>
  if (ast.body.length === 0) return <div className="tree-view empty-hint">Empty program.</div>
  return (
    <div className="tree-view ast-tree">
      <TreeNode label="" node={ast} depth={0} />
    </div>
  )
}
