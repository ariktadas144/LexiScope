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

The intended Lexi language is a small imperative language with declarations, arithmetic and boolean expressions, assignment, conditionals, and loops. The current working slice supports `let` declarations, `print`, numeric and boolean literals, identifiers, and arithmetic operators. The conditional, loop, assignment, comparison, and logical-operator grammar is documented as the next language expansion.

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
| Compiler core | Hand-written lexer, recursive-descent parser, semantic analyzer, TAC generator, interpreter |
| Front end | React 19 |
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

### Completed

- [x] Project title, abstract, problem statement, motivation, objectives, and scope documented here.
- [x] `docs/language-spec.md` and `docs/grammar.ebnf` exist.
- [x] TypeScript, React, Vite, Vitest, Oxlint, Git, and GitHub setup completed.
- [x] `src/core/lexer/token.ts` defines token kinds and token positions.
- [x] `src/core/lexer/lexer.ts` implements a hand-written scanner.
- [x] Lexical failures are reported with a lexical stage and line information.
- [x] `src/core/lexer/lexer.test.ts` exists and the test suite passes.
- [x] `src/core/pipeline.ts` exposes structured pipeline output.
- [x] The playground has a source editor, live token view, output, and error panel.
- [x] Three selectable examples exist, including a deliberate lexical error.
- [x] Local setup and review workflow are documented.
- [x] Initial commit is pushed to GitHub.

### Partially completed or planned

- [ ] The full Phase 1 language specification includes `int`, `bool`, assignment, comparisons, and logical operators; the current executable subset is smaller.
- [ ] The requested `docs/architecture-diagram.png` is represented by the architecture diagram in this README; a standalone PNG has not been added.
- [ ] The editor is a resilient textarea fallback, not CodeMirror with syntax highlighting.
- [ ] The UI updates immediately through a React-derived pipeline result; a dedicated 300 ms debounce hook is still planned.
- [ ] The token view currently uses categorized token chips rather than a full index/type/lexeme/line/column table.
- [ ] The AST is rendered as a structured JSON view, not yet as an interactive graph.
- [ ] Lexer tests need additional explicit unknown-character and unterminated-string cases for the full checklist.

### Beyond Phase 1

The repository already implements more than the Phase 1 prototype: parsing and AST construction, semantic identifier/type checks, a symbol table, three-address code generation, interpretation, focused tests for all of those stages, and UI panels for AST, symbols, TAC, and output. Constant folding is present as an isolated optimizer utility but is not yet wired into the pipeline.

## Known Limitations and Next Steps

1. Expand the parser and AST for `if`, `else`, `while`, assignment, comparison, and logical expressions.
2. Add nested scope management, redeclaration checks, and explicit `int`/`bool` types.
3. Integrate constant folding into TAC generation and show optimized versus unoptimized IR.
4. Add a debounced compilation hook and richer token table columns.
5. Add a graph-based AST renderer and a standalone architecture image.
6. Increase negative-test coverage for every lexical and semantic error category.

## Academic Context

LexiScope applies finite-automaton-style scanning, LL-oriented recursive-descent parsing, AST-based analysis, symbol-table lookup, and machine-independent three-address code. It is intentionally educational: the implementation favors inspectable intermediate structures and clear phase boundaries over language completeness.
