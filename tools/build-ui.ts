/**
 * UI-Grafik (docs/05 § Design-Tokens): 9-Slice-Rahmen mit 2 Spiel-Pixel abgeschrägten Ecken
 * und Pixel-Symbole, nur aus der UI-Palette (art/palettes/ui.json, geprüft von check:palette).
 * Ausgabe: art/build/ui/frame-<name>.albedo.png, art/build/ui/icons.albedo.png + icons.json.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { ROOT } from './lib/files.ts';
import type { Palette } from './lib/palette.ts';

const palette = JSON.parse(readFileSync(join(ROOT, 'art/palettes/ui.json'), 'utf8')) as Palette;
const R = palette.ramps;
const KEYS: Record<string, string> = {
  k: R.base![0]!,
  b: R.base![1]!,
  p: R.base![2]!,
  h: R.base![3]!,
  l: R.base![4]!,
  L: R.base![5]!,
  t: R.text![0]!,
  T: R.text![1]!,
  g: R.positive![0]!,
  G: R.positive![1]!,
  r: R.risk![0]!,
  Q: R.risk![1]!,
  w: R.warning![0]!,
  W: R.warning![1]!,
  s: R.star![0]!,
  S: R.star![1]!,
  z: R.star![2]!,
  c: R.crystal![0]!,
  C: R.crystal![1]!,
  x: R.crystal![2]!,
  a: R.accent![0]!,
  A: R.accent![1]!,
  y: R.accent![2]!,
};

function paint(png: PNG, rows: readonly string[], ox: number, oy: number): void {
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const hex = KEYS[ch];
      if (!hex) return;
      const i = ((oy + y) * png.width + ox + x) * 4;
      const n = parseInt(hex.slice(1), 16);
      png.data[i] = (n >> 16) & 255;
      png.data[i + 1] = (n >> 8) & 255;
      png.data[i + 2] = n & 255;
      png.data[i + 3] = 255;
    });
  });
}

/** 8 × 8, Slice 3: Ecke abgeschrägt, 1 Pixel Kante, oben optional ein Glanzpixel. */
function frame(line: string, fill: string, shine = fill): string[] {
  const f = fill;
  return [
    `..${line.repeat(4)}..`,
    `.${line}${shine.repeat(4)}${line}.`,
    `${line}${f.repeat(6)}${line}`,
    `${line}${f.repeat(6)}${line}`,
    `${line}${f.repeat(6)}${line}`,
    `${line}${f.repeat(6)}${line}`,
    `.${line}${f.repeat(4)}${line}.`,
    `..${line.repeat(4)}..`,
  ];
}

const FRAMES: Record<string, string[]> = {
  panel: frame('l', 'p'),
  high: frame('L', 'h'),
  primary: frame('a', 'A', 'y'),
  secondary: frame('L', 'h', 'L'),
  positive: frame('g', 'G'),
  danger: frame('r', 'Q'),
  coach: frame('A', '.'),
  bubble: frame('l', 'T'),
};

const ICONS: Record<string, string[]> = {
  coin: [
    '....aaaa....',
    '..aaAAAAaa..',
    '.aAAyyyyAAa.',
    '.aAyAAAAAAa.',
    'aAyAAaaAAAAa',
    'aAyAaAAaAAAa',
    'aAAAaAAaAAAa',
    'aAAAAaaAAAAa',
    '.aAAAAAAAAa.',
    '.aaAAAAAAaa.',
    '..aaAAAAaa..',
    '....aaaa....',
  ],
  star: [
    '.....ss.....',
    '.....SS.....',
    '....sSSs....',
    '....SzSS....',
    'sssSSzSSSsss',
    '.sSSSSSSSSs.',
    '..sSSSSSSs..',
    '...sSSSSs...',
    '..sSSssSSs..',
    '..sSs..sSs..',
    '.sSs....sSs.',
    '.ss......ss.',
  ],
  crystal: [
    '....cccc....',
    '...cxxCCc...',
    '..cxCCCCCc..',
    '.cCCCCCCCCc.',
    'cccccccccccc',
    '.cCCCCCCCCc.',
    '..cCCCCCCc..',
    '...cCCCCc...',
    '....cCCc....',
    '.....cc.....',
    '............',
    '............',
  ],
  gear: [
    '....tTTt....',
    '.tt.TTTT.tt.',
    '.tTTTTTTTTt.',
    '..TTTttTTT..',
    'tTTTt..tTTTt',
    'TTTt....tTTT',
    'TTTt....tTTT',
    'tTTTt..tTTTt',
    '..TTTttTTT..',
    '.tTTTTTTTTt.',
    '.tt.TTTT.tt.',
    '....tTTt....',
  ],
  build: [
    '............',
    '.LLLLLLL....',
    'LTTTTTTTL...',
    'LTTTTTTTL...',
    '.LLLaALLL...',
    '....aAa.....',
    '....aAa.....',
    '....aAa.....',
    '....aAa.....',
    '....aAa.....',
    '....aAa.....',
    '.....a......',
  ],
  goal: [
    '..L.........',
    '..LAAAAAA...',
    '..LAyyyAAA..',
    '..LAAAAAAAA.',
    '..LAAAAAAa..',
    '..LAAAAaa...',
    '..L.........',
    '..L.........',
    '..L.........',
    '..L.........',
    '.LLL........',
    'LLLLL.......',
  ],
  eras: [
    '....cccc....',
    '..ccCCCCcc..',
    '.cCxxCCCCCc.',
    '.cCxCCCCCCc.',
    'TTTTTTTTTTTT',
    'cCCCCCCCCCCc',
    '.cCCCCCCCCc.',
    '.cCCCCCCCCc.',
    '..ccCCCCcc..',
    '....cccc....',
    '............',
    '............',
  ],
  lock: [
    '....llll....',
    '...l....l...',
    '...l....l...',
    '...l....l...',
    '..wwwwwwww..',
    '..wWWWWWWw..',
    '..wWWkkWWw..',
    '..wWWkkWWw..',
    '..wWWWkWWw..',
    '..wWWWWWWw..',
    '..wwwwwwww..',
    '............',
  ],
  warn: [
    '.....ww.....',
    '....wWWw....',
    '....wWWw....',
    '...wWkkWw...',
    '...wWkkWw...',
    '..wWWkkWWw..',
    '..wWWkkWWw..',
    '.wWWWWWWWWw.',
    '.wWWWkkWWWw.',
    'wWWWWWWWWWWw',
    'wwwwwwwwwwww',
    '............',
  ],
  close: [
    '............',
    '.TT......TT.',
    '.TTT....TTT.',
    '..TTT..TTT..',
    '...TTTTTT...',
    '....TTTT....',
    '....TTTT....',
    '...TTTTTT...',
    '..TTT..TTT..',
    '.TTT....TTT.',
    '.TT......TT.',
    '............',
  ],
  check: [
    '............',
    '..........GG',
    '.........GGG',
    '........GGG.',
    '.......GGG..',
    'GG....GGG...',
    'GGG..GGG....',
    '.GGGGGG.....',
    '..GGGG......',
    '...GG.......',
    '............',
    '............',
  ],
  clock: [
    '..TTTTTTTT..',
    '..tAAAAAAt..',
    '...tAAAAt...',
    '....tAAt....',
    '.....tt.....',
    '.....tt.....',
    '....t..t....',
    '...t.AA.t...',
    '..tAAAAAAt..',
    '..TTTTTTTT..',
    '............',
    '............',
  ],
  up: [
    '.....GG.....',
    '....GGGG....',
    '...GGGGGG...',
    '..GGGGGGGG..',
    '.GGG.GG.GGG.',
    '....GGGG....',
    '....GGGG....',
    '....GGGG....',
    '....GGGG....',
    '....GGGG....',
    '............',
    '............',
  ],
};

const ICON = 12;
const out = join(ROOT, 'art/build/ui');
mkdirSync(out, { recursive: true });

for (const [name, rows] of Object.entries(FRAMES)) {
  const png = new PNG({ width: 8, height: 8 });
  paint(png, rows, 0, 0);
  writeFileSync(join(out, `frame-${name}.albedo.png`), PNG.sync.write(png, { colorType: 6 }));
}

const names = Object.keys(ICONS);
const sheet = new PNG({ width: ICON * names.length, height: ICON });
names.forEach((name, i) => paint(sheet, ICONS[name]!, i * ICON, 0));
writeFileSync(join(out, 'icons.albedo.png'), PNG.sync.write(sheet, { colorType: 6 }));
writeFileSync(
  join(out, 'icons.json'),
  JSON.stringify({ size: ICON, icons: names }, null, 2) + '\n',
);
console.log(`build-ui – ${Object.keys(FRAMES).length} Rahmen, ${names.length} Symbole.`);
