/**
 * Reinheitsprüfung der Simulation (AGENTS Regel 4 + 5): AST-basiert, damit Kommentare
 * und Strings keine Fehlalarme auslösen.
 */
import ts from 'typescript';

export type PurityRule =
  'forbidden-import' | 'wall-clock' | 'random' | 'dom-global' | 'timer' | 'bignum-outside-num';

export interface PurityViolation {
  path: string;
  line: number;
  column: number;
  rule: PurityRule;
  text: string;
}

const FORBIDDEN_MODULES = [
  /^pixi\.js/,
  /^@pixi\//,
  /^@capacitor/,
  /^preact/,
  /^@preact\//,
  /^node:/,
];
const NODE_BUILTINS = new Set(['fs', 'path', 'os', 'crypto', 'child_process', 'process', 'url']);
const DOM_GLOBALS = new Set([
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'fetch',
  'XMLHttpRequest',
  'process',
]);
const TIMERS = new Set(['setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask']);

const isNumModule = (path: string) => /packages\/sim\/src\/num\//.test(path.replace(/\\/g, '/'));

function moduleRule(specifier: string, path: string): PurityRule | undefined {
  if (specifier === 'break_infinity.js')
    return isNumModule(path) ? undefined : 'bignum-outside-num';
  if (FORBIDDEN_MODULES.some((re) => re.test(specifier)) || NODE_BUILTINS.has(specifier)) {
    return 'forbidden-import';
  }
  return undefined;
}

/** Ist `node` ein freier Bezeichner (kein Eigenschafts- oder Deklarationsname)? */
function isFreeIdentifier(node: ts.Identifier): boolean {
  const p = node.parent;
  if (ts.isShorthandPropertyAssignment(p)) return true;
  if (ts.isPropertyAccessExpression(p) && p.name === node) return false;
  if (
    (ts.isPropertyAssignment(p) ||
      ts.isPropertyDeclaration(p) ||
      ts.isPropertySignature(p) ||
      ts.isMethodDeclaration(p) ||
      ts.isVariableDeclaration(p) ||
      ts.isParameter(p)) &&
    p.name === node
  ) {
    return false;
  }
  if (ts.isImportSpecifier(p) || ts.isExportSpecifier(p)) return false;
  if (ts.isTypeReferenceNode(p) || ts.isQualifiedName(p)) return false;
  return true;
}

function memberName(node: ts.Node): string | undefined {
  if (!ts.isPropertyAccessExpression(node) || !ts.isIdentifier(node.expression)) return undefined;
  return `${node.expression.text}.${node.name.text}`;
}

function importedModule(node: ts.Node): string | undefined {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteral(node.moduleSpecifier)
  ) {
    return node.moduleSpecifier.text;
  }
  if (
    ts.isCallExpression(node) &&
    (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
    node.arguments[0] &&
    ts.isStringLiteral(node.arguments[0])
  ) {
    return node.arguments[0].text;
  }
  return undefined;
}

function ruleFor(node: ts.Node, path: string): PurityRule | undefined {
  const mod = importedModule(node);
  if (mod !== undefined) return moduleRule(mod, path);
  if (
    ts.isNewExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'Date'
  ) {
    return 'wall-clock';
  }
  const member = memberName(node);
  if (member === 'Date.now' || member === 'performance.now') return 'wall-clock';
  if (member === 'Math.random' || member === 'crypto.getRandomValues') return 'random';
  if (ts.isIdentifier(node) && isFreeIdentifier(node)) {
    if (DOM_GLOBALS.has(node.text)) return 'dom-global';
    if (TIMERS.has(node.text)) return 'timer';
  }
  return undefined;
}

export function findPurityViolations(
  files: readonly { path: string; source: string }[],
): PurityViolation[] {
  const out: PurityViolation[] = [];
  for (const { path, source } of files) {
    const sf = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node): void => {
      const rule = ruleFor(node, path);
      if (rule) {
        const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        out.push({ path, line: line + 1, column: character + 1, rule, text: node.getText(sf) });
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return out;
}
