import type { ValueType } from '../parser/ast'

export interface SymbolEntry {
  /** Name as written in the source. */
  name: string
  /**
   * Name used in intermediate code. The first variable called `x` keeps the
   * name `x`; a later variable with the same name in another scope becomes
   * `x.2` (a `.` cannot occur in a Lexi identifier, so it never collides).
   */
  uniqueName: string
  type: ValueType
  scope: string
  /** Nesting depth of the scope (0 = global). */
  depth: number
  /** Declaration site. */
  line: number
  column: number
  /** Final value after execution, filled in by the pipeline. */
  value?: string
}

interface Scope {
  label: string
  depth: number
  names: Map<string, SymbolEntry>
}

/** Names that the code generator uses for temporaries (t1, t2, ...). */
const reservedForTemporaries = /^t\d+$/

/** Scope-aware symbol table: a stack of scopes plus a log of every declaration. */
export class SymbolTable {
  private readonly stack: Scope[] = [{ label: 'global', depth: 0, names: new Map() }]
  private readonly log: SymbolEntry[] = []
  private readonly uses = new Map<string, number>()
  private blockCounter = 0

  get currentScope(): string {
    return this.stack[this.stack.length - 1].label
  }

  get depth(): number {
    return this.stack.length - 1
  }

  enterScope(): void {
    this.blockCounter++
    this.stack.push({ label: `block ${this.blockCounter}`, depth: this.stack.length, names: new Map() })
  }

  exitScope(): void {
    if (this.stack.length > 1) this.stack.pop()
  }

  /** Looks a name up in the current scope only (used for redeclaration checks). */
  lookupLocal(name: string): SymbolEntry | undefined {
    return this.stack[this.stack.length - 1].names.get(name)
  }

  /** Looks a name up from the innermost scope outwards. */
  lookup(name: string): SymbolEntry | undefined {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const entry = this.stack[i].names.get(name)
      if (entry) return entry
    }
    return undefined
  }

  /** Declares a variable in the current scope. The caller checks for redeclaration first. */
  declare(name: string, type: ValueType, line: number, column: number): SymbolEntry {
    const count = (this.uses.get(name) ?? 0) + 1
    this.uses.set(name, count)
    const reserved = reservedForTemporaries.test(name)
    const entry: SymbolEntry = {
      name,
      uniqueName: count === 1 && !reserved ? name : `${name}.${count}`,
      type,
      scope: this.currentScope,
      depth: this.depth,
      line,
      column,
    }
    this.stack[this.stack.length - 1].names.set(name, entry)
    this.log.push(entry)
    return entry
  }

  /** Every declaration made so far, in source order (includes closed scopes). */
  all(): SymbolEntry[] {
    return [...this.log]
  }
}
