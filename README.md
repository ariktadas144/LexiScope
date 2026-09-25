# LexiScope

### An interactive web-based playground and real-time visualization tool for compiler phases

**Name:** Arikta Das
**Registration number:** 24BCE2303  
**Course:** Compiler Design Lab Project

## Abstract

Compiler Design involves multiple stages through which source code is transformed into an executable representation. LexiScope makes those usually hidden transformations visible in one browser-based workbench. A user can enter Lexi source code and inspect its tokens, abstract syntax tree, symbol table, three-address code, diagnostics, and interpreter output as the source changes.

The project is designed as a teaching tool rather than a black-box compiler. Each compiler stage returns structured data that the React interface renders independently, so a small edit can be traced from source text through the pipeline and into the final output.

## Problem Statement

Compiler concepts such as tokenization, parsing, scope resolution, type checking, and intermediate-code generation are difficult to learn because most of the work happens invisibly between source code and output. Students commonly rely on static diagrams, hand-traced examples, or command-line tools that print intermediate output without connecting it back to the original source.

LexiScope addresses this gap with a single interactive playground. It keeps the source editor and compiler representations visible together, gives errors a phase label and location, and short-circuits the pipeline at the first invalid stage so the failure is easier to understand.

## Motivation

- Existing compiler teaching tools are often either static or difficult to inspect interactively.
- Visual feedback helps learners build accurate mental models of abstract transformations.
- Implementing the phases by hand provides direct experience with classical compiler design instead of only configuring Lex/Yacc-style generators.
- A web application is easy to demonstrate in a review or viva and requires no external API or backend service.

## Objectives

- Define a small source language with documented tokens, grammar, and semantic rules.
- Implement a hand-written lexer with line and column information.
- Implement a recursive-descent parser that produces an AST.
- Implement semantic analysis with a symbol table and identifier validation.
- Generate three-address code from the AST.
- Interpret valid programs and show their output.
- Visualize compiler data in an adaptive React interface.
- Present lexical, syntax, semantic, and runtime failures as phase-specific diagnostics.

## Scope

Lexi is a small imperative language: typed and inferred declarations (`let`, `int`, `boolean`, `string`), assignment, `print`, `if`/`else`/`else if`, `while`, block scoping, arithmetic (`+ - * / %`), comparison (`< > <= >=`), equality (`== !=`), logical operators (`&& ||`, short-circuiting) and unary `! -`, with standard precedence and parentheses. See [docs/language-spec.md](docs/language-spec.md) and [docs/grammar.ebnf](docs/grammar.ebnf) for the full grammar.

## Architecture

```text
Source editor
    |
    v
Lexer -> Token stream -> Parser -> AST -> Semantic analyzer -> Symbol table
                                             |
                                             v
                                  TAC generator -> Interpreter -> Output
```

The core pipeline is framework-agnostic TypeScript. The UI is a responsive React workbench with source, output, diagnostics, token, AST, symbol, and IR panels. The detailed grammar and language notes live in [docs/grammar.ebnf](docs/grammar.ebnf) and [docs/language-spec.md](docs/language-spec.md).

## Technical Stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript |
| Compiler core | Hand-written lexer, recursive-descent parser, semantic analyzer, TAC generator with constant folding, TAC-executing interpreter |
| Front end | React 19, CodeMirror 6 (syntax highlighting, inline error diagnostics) |
| Styling | Responsive CSS with Space Grotesk and DM Mono Google Fonts |
| Build tooling | Vite and Node.js |
| Icons | lucide-react |
| Testing | Vitest |
| Linting | Oxlint |
| Version control | Git and GitHub |

## Local Development

Requirements: Node.js 20 or newer and npm.

```bash
git clone https://github.com/ariktadas144/LexiScope.git
cd LexiScope
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

```bash
npm test       # Run compiler unit tests
npm run lint   # Run Oxlint
npm run build  # Type-check and create the production bundle
npm run preview
```

The application runs offline after dependencies are installed. Google Fonts are an optional visual enhancement; the layout remains usable if the font request is unavailable.

## Repository Layout

```text
src/
  core/                    Framework-agnostic compiler pipeline
    lexer/                 Token definitions and scanner
    parser/                AST definitions and parser
    semantic/              Symbol table and semantic checks
    codegen/               Three-address code generation
    optimizer/             Constant-folding utility
    interpreter/           Program execution
    errors/                Compiler error model
  ui/                      React components and compiler hook
  examples/                Selectable demo programs
docs/                      Language specification and proposal
tests/fixtures/            Valid and invalid Lexi programs
```

## Phase 1 Deliverable Review

Phase 1 delivered the project documentation, tooling setup, the lexer, and an initial playground UI with a token view, output and error panel. See the git history for that milestone.

## Phase 2: Core Implementation

### Completed

- [x] Full pipeline wired end to end: lexer -> parser/AST -> semantic analyzer + symbol table -> TAC generator (with constant folding) -> TAC-executing interpreter.
- [x] Language grammar expanded to `if`/`else`/`else if`, `while`, block scoping, assignment, comparison (`< > <= >=`), equality (`== !=`), logical `&&`/`||` (short-circuiting), unary `!`/`-`, parentheses, and full operator precedence.
- [x] Explicit types (`int`, `boolean`, `string`) alongside inferred `let`; declared-type checking, assignment-type checking, and operand-type checking throughout.
- [x] Nested, scope-aware symbol table (a stack of scopes) with redeclaration checks and unique names for shadowed variables.
- [x] Three-address code has labels, `goto` and `ifFalse` for `if`/`while`, plus short-circuit lowering for `&&`/`||`.
- [x] The interpreter is a virtual machine that executes the generated TAC (not the AST), with a step limit (guards against infinite loops) and an output-line limit.
- [x] Constant folding is integrated into the pipeline; the UI can toggle between optimized and unoptimized TAC.
- [x] Runtime errors: division/modulo by zero, 32-bit integer overflow, step-limit exceeded.
- [x] CodeMirror 6 editor with Lexi syntax highlighting and inline error diagnostics (underline + gutter marker at the exact failure position), replacing the Phase 1 textarea.
- [x] Debounced compile-as-you-type (`useCompilerPipeline`, 300 ms).
- [x] Expandable/collapsible AST tree view (click to expand/collapse a node), replacing the flat JSON dump.
- [x] Sortable symbol table (click a column header), showing name, type, scope and the variable's final value.
- [x] Pipeline diagnostics panel reflects real per-stage status (ok / error / skipped, i.e. "not reached").
- [x] 147 automated tests: unit tests per module, a fixture runner over `tests/fixtures/` (11 valid programs, 15 invalid programs across all four error stages), full-pipeline integration tests, and a randomized differential test that checks thousands of generated expressions against an independent BigInt reference evaluator.
- [x] `npm run lint` (Oxlint), `npm run build` (type-check + production bundle) and `npm test` all pass.

### Partially completed or planned

- [ ] No dead-code elimination or other optimizations beyond constant folding.
- [ ] No `for` loops, functions, or arrays; Lexi remains a mini-language by design.
- [ ] Error recovery reports only the first error per phase; there is no multi-error reporting.
- [ ] No source maps back from TAC to AST beyond the line/column already carried on each instruction.

## Known Limitations and Next Steps

1. Add functions/procedures if time permits, as a further stretch goal.
2. Add more aggressive optimizations (dead-code elimination, common-subexpression elimination) alongside constant folding.
3. Add multi-error reporting (collect more than one diagnostic per compile) instead of stopping at the first.
4. Continue growing the fixture and property-test suites as the language grows.

## Academic Context

LexiScope applies finite-automaton-style scanning, LL-oriented recursive-descent parsing with full operator-precedence climbing, AST-based semantic analysis with nested scopes, symbol-table lookup, machine-independent three-address code with control-flow lowering (labels/gotos), constant folding, and a small virtual machine that executes the generated IR. It is intentionally educational: the implementation favors inspectable intermediate structures and clear phase boundaries over language completeness.
