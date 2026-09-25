# Lexi language specification (Phase 2)

## Types
`int` (32-bit signed, -2147483648 to 2147483647), `boolean` (`true`/`false`), `string` (single-line, no escape sequences).

## Declarations
- `let name = expr;` - type inferred from `expr`.
- `int name = expr;` / `boolean name = expr;` / `string name = expr;` - explicit type, checked against `expr`.
- Redeclaring a name already declared in the same scope is a semantic error.

## Assignment
`name = expr;` - `name` must already be declared in the current or an enclosing scope; `expr` must match its type.

## Statements
- `print expr;` (parentheses optional: `print(expr);`)
- `{ statement* }` - a block; opens a new scope.
- `if (expr) block [else (if ... | block)]`
- `while (expr) block`

## Expressions and operators (precedence, lowest to highest)
1. `||`
2. `&&`
3. `==`, `!=`
4. `<`, `>`, `<=`, `>=`
5. `+`, `-`
6. `*`, `/`, `%`
7. unary `!`, unary `-`

All binary operators are left-associative. Parentheses `()` override precedence.

`/` and `%` truncate toward zero (`-7 / 2` is `-3`, `-7 % 3` is `-1`). `&&` and `||` short-circuit: the right operand is not evaluated once the left operand already decides the result.

## Scope
Every block introduces a new scope. A variable is visible in its own scope and any nested scope, but not outside the block where it was declared. A variable may shadow one of the same name from an enclosing scope.

## Errors
| Stage | Examples |
|---|---|
| Lexical | unknown character, unterminated string, decimal literal, integer out of range |
| Syntax | missing `;`, unbalanced `()`/`{}`, missing expression, dangling `else` |
| Semantic | undeclared identifier, redeclaration, type mismatch, non-boolean condition |
| Runtime | division/modulo by zero, integer overflow, step limit exceeded, output line limit exceeded |

Only the first error is reported; the pipeline stops at that phase but keeps every result already produced (tokens, AST, symbols so far).
