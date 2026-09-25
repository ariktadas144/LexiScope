import { describe, expect, it } from 'vitest'
import { compile } from './pipeline'

/**
 * Runs every program in tests/fixtures. Each `name.lex` has a `name.expected`:
 *  - valid/            expected file = the exact program output;
 *  - invalid-<stage>/  expected file = "line:column" on the first line and a
 *                      fragment of the error message on the second.
 */
const files = import.meta.glob('../../tests/fixtures/**/*', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const cases = Object.keys(files)
  .filter((path) => path.endsWith('.lex'))
  .map((path) => {
    const [, folder, name] = path.match(/fixtures\/([^/]+)\/([^/]+)\.lex$/) ?? []
    return { folder, name, source: files[path], expected: files[path.replace(/\.lex$/, '.expected')] }
  })

describe('fixture programs', () => {
  it('finds fixtures for every category', () => {
    for (const folder of ['valid', 'invalid-lexical', 'invalid-syntax', 'invalid-semantic', 'invalid-runtime']) {
      expect(cases.some((c) => c.folder === folder)).toBe(true)
    }
  })

  for (const { folder, name, source, expected } of cases) {
    it(`${folder}/${name}`, () => {
      expect(expected, 'missing .expected file').toBeDefined()
      const result = compile(source)
      if (folder === 'valid') {
        expect(result.error).toBeUndefined()
        expect(result.output.join('\n')).toBe(expected.replace(/\n$/, ''))
      } else {
        const [position, fragment] = expected.split('\n')
        expect(result.error?.stage).toBe(folder.replace('invalid-', ''))
        expect(`${result.error?.line}:${result.error?.column}`).toBe(position)
        expect(result.error?.message).toContain(fragment)
      }
    })
  }
})
