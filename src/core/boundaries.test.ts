import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

it('AC-005: 纯计算与教学数据不依赖 React、浏览器或基础设施', () => {
  for (const file of readdirSync('src/core').filter(
    (name) => name.endsWith('.ts') && !name.endsWith('.test.ts'),
  )) {
    const path = join('src/core', file);
    const tree = ts.createSourceFile(
      path,
      readFileSync(path, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier))
          expect(node.moduleSpecifier.text, path).toMatch(/^\.\//);
      }
      if (ts.isIdentifier(node))
        expect(
          ['document', 'window', 'fetch', 'localStorage'].includes(node.text),
          `${path}: ${node.text}`,
        ).toBe(false);
      ts.forEachChild(node, visit);
    };
    visit(tree);
  }
});
