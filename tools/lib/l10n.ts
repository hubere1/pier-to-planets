/** Paritätsprüfung der Sprachdateien (AGENTS Regel 13, docs/05 § Lokalisierung). */
export type L10nProblemKind =
  | 'missing-in-en'
  | 'extra-in-en'
  | 'placeholder-mismatch'
  | 'empty'
  | 'not-a-string'
  | 'control-char';

export interface L10nProblem {
  kind: L10nProblemKind;
  key: string;
  detail?: string;
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();

/** Steuerzeichen außer Zeilenumbruch (Lehre 13). */
function hasControlChar(s: string): boolean {
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    if (c === 0x0a) continue;
    if (c < 0x20 || (c >= 0x7f && c <= 0x9f)) return true;
  }
  return false;
}

export function compareCatalogs(
  de: Record<string, unknown>,
  en: Record<string, unknown>,
): L10nProblem[] {
  const problems: L10nProblem[] = [];
  for (const key of Object.keys(de)) {
    if (!(key in en)) problems.push({ kind: 'missing-in-en', key });
  }
  for (const key of Object.keys(en)) {
    if (!(key in de)) problems.push({ kind: 'extra-in-en', key });
  }

  const catalogs = [
    ['de', de],
    ['en', en],
  ] as const;
  for (const [lang, catalog] of catalogs) {
    for (const [key, value] of Object.entries(catalog)) {
      if (typeof value !== 'string') problems.push({ kind: 'not-a-string', key, detail: lang });
      else if (value.trim() === '') problems.push({ kind: 'empty', key, detail: lang });
      else if (hasControlChar(value)) problems.push({ kind: 'control-char', key, detail: lang });
    }
  }

  for (const [key, value] of Object.entries(de)) {
    const other = en[key];
    if (typeof value !== 'string' || typeof other !== 'string') continue;
    const a = placeholders(value).join(',');
    const b = placeholders(other).join(',');
    if (a !== b) {
      problems.push({ kind: 'placeholder-mismatch', key, detail: `de {${a}} ≠ en {${b}}` });
    }
  }
  return problems;
}
