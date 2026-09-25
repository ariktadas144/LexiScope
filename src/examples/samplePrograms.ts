export interface SampleProgram {
  name: string
  group: 'Programs' | 'Error demos'
  source: string
}

export const samplePrograms: SampleProgram[] = [
  {
    name: 'Review example',
    group: 'Programs',
    source: 'int x = 10;\nint y = x + 5;\nprint(y);\n',
  },
  {
    name: 'Arithmetic intro',
    group: 'Programs',
    source: '// Multiplication binds tighter than addition\nlet base = 7;\nlet bonus = 5;\nprint base + bonus * 2;\n',
  },
  {
    name: 'Conditions',
    group: 'Programs',
    source:
      'int n = 0;\n\nif (n < 0) {\n  print "negative";\n} else if (n == 0) {\n  print "zero";\n} else {\n  print "positive";\n}\n',
  },
  {
    name: 'While loop: sum',
    group: 'Programs',
    source: 'int i = 1;\nint sum = 0;\n\nwhile (i <= 10) {\n  sum = sum + i;\n  i = i + 1;\n}\n\nprint sum;\n',
  },
  {
    name: 'Factorial',
    group: 'Programs',
    source: 'int n = 6;\nint result = 1;\n\nwhile (n > 1) {\n  result = result * n;\n  n = n - 1;\n}\n\nprint result;\n',
  },
  {
    name: 'Scopes and shadowing',
    group: 'Programs',
    source: 'let x = 1;\n{\n  let x = 2; // a new variable in an inner scope\n  print x;\n}\nprint x;\n',
  },
  {
    name: 'Constant folding',
    group: 'Programs',
    source: '// Compare optimized and unoptimized TAC\nint seconds = 60 * 60 * 24;\nprint seconds;\nprint 2 + 3 * 4;\nprint seconds / 2 + (10 - 4);\n',
  },
  {
    name: 'Boolean logic',
    group: 'Programs',
    source: 'int age = 20;\nboolean member = false;\n\nif (age >= 18 && (member || age < 25)) {\n  print "discount";\n} else {\n  print "full price";\n}\n',
  },
  {
    name: 'Lexical error',
    group: 'Error demos',
    source: 'let value = 4 @ 2;\n',
  },
  {
    name: 'Syntax error',
    group: 'Error demos',
    source: 'let value = 4\nprint value;\n',
  },
  {
    name: 'Semantic error: undeclared',
    group: 'Error demos',
    source: 'int a = 1;\nprint a + missing;\n',
  },
  {
    name: 'Semantic error: types',
    group: 'Error demos',
    source: 'int count = 3;\ncount = true;\n',
  },
  {
    name: 'Runtime error: divide by zero',
    group: 'Error demos',
    source: 'print 1;\nint zero = 0;\nprint 10 / zero;\n',
  },
  {
    name: 'Runtime error: infinite loop',
    group: 'Error demos',
    source: 'while (true) {\n}\n',
  },
]
