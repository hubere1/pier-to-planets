import { describe, expect, it } from 'vitest';
import { findPurityViolations } from '../lib/purity.ts';

const check = (source: string, path = 'packages/sim/src/x.ts') =>
  findPurityViolations([{ path, source }]).map((v) => v.rule);

describe('findPurityViolations (AGENTS Regel 4/5)', () => {
  it('akzeptiert reinen Code', () => {
    expect(check('export const add = (a: number, b: number) => a + b;')).toEqual([]);
  });

  it.each([
    ["import * as PIXI from 'pixi.js';", 'forbidden-import'],
    ["import { App } from '@capacitor/app';", 'forbidden-import'],
    ["import { h } from 'preact';", 'forbidden-import'],
    ["import fs from 'node:fs';", 'forbidden-import'],
    ["const x = await import('pixi.js');", 'forbidden-import'],
    ['const now = Date.now();', 'wall-clock'],
    ['const d = new Date();', 'wall-clock'],
    ['const r = Math.random();', 'random'],
    ['const p = performance.now();', 'wall-clock'],
    ['window.foo = 1;', 'dom-global'],
    ['document.body;', 'dom-global'],
    ['localStorage.getItem("a");', 'dom-global'],
    ['requestAnimationFrame(() => {});', 'dom-global'],
    ['setTimeout(() => {}, 1);', 'timer'],
  ])('meldet %s', (source, rule) => {
    expect(check(source)).toContain(rule);
  });

  it('ignoriert Kommentare und Strings', () => {
    expect(check('// Date.now() ist verboten\nconst s = "Math.random()";')).toEqual([]);
  });

  it('erlaubt break_infinity nur im Num-Wrapper', () => {
    const src = "import Decimal from 'break_infinity.js';";
    expect(check(src, 'packages/sim/src/econ/flow.ts')).toContain('bignum-outside-num');
    expect(check(src, 'packages/sim/src/num/num.ts')).toEqual([]);
  });

  it('erlaubt Eigenschaften gleichen Namens auf eigenen Objekten', () => {
    expect(check('const s = { document: 1 }; s.document; ctx.window;')).toEqual([]);
  });

  it('liefert Zeile und Spalte', () => {
    const [v] = findPurityViolations([{ path: 'a.ts', source: '\n\n  Math.random();' }]);
    expect(v).toMatchObject({ path: 'a.ts', line: 3, column: 3 });
  });
});
