#!/usr/bin/env node
// Regenerates the generated part of src/styles/tokens.css from design_spec §10
// (References/design.md, "### CSS Custom Properties" code block).
//
//   node scripts/sync-tokens.mjs          rewrite tokens.css
//   node scripts/sync-tokens.mjs --check  exit 1 if tokens.css drifts from the spec
//
// Generated: the @theme primitive block, the :root block and the dark block.
// Hand-maintained: everything after the HAND_MARKER line (the @theme inline aliases).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SPEC = resolve(here, '../../References/design.md');
const OUT = resolve(here, '../src/styles/tokens.css');
const HAND_MARKER = '/* ---- Hand-maintained below this line: sync-tokens.mjs keeps it as is. ---- */';

const check = process.argv.includes('--check');

function fail(msg) {
  console.error(`sync-tokens: ${msg}`);
  process.exit(1);
}

// 1. Pull the §10 CSS block.
const spec = readFileSync(SPEC, 'utf8');
const heading = spec.indexOf('### CSS Custom Properties');
if (heading < 0) fail('"### CSS Custom Properties" not found in References/design.md');
const open = spec.indexOf('```css', heading);
const close = spec.indexOf('```', open + 6);
if (open < 0 || close < 0) fail('§10 css code block not found');
const block = spec.slice(open + 6, close);

const darkAt = block.indexOf('@media (prefers-color-scheme: dark)');
if (darkAt < 0) fail('§10 dark-mode block not found');

const decls = (css) => [...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]);
const root = decls(block.slice(0, darkAt));
const dark = decls(block.slice(darkAt));
if (!root.length || !dark.length) fail('no declarations parsed from §10');

// 2. Split :root between @theme (becomes Tailwind utilities) and plain :root.
//    Semantic colours (the ones dark mode overrides) must stay out of @theme so they can flip.
const semantic = new Set(dark.map(([n]) => n));
const toTheme = (n) =>
  !semantic.has(n) &&
  (/^--color-/.test(n) ||
    (/^--radius-/.test(n) && n !== '--radius-0') ||
    /^--shadow-/.test(n) ||
    /^--font-(display|brand|body|counter)$/.test(n) ||
    /^--text-/.test(n) ||
    (/^--breakpoint-/.test(n) && n !== '--breakpoint-mobile'));

const themeDecls = root.filter(([n]) => toTheme(n));
const rootDecls = [
  ...root.filter(([n]) => semantic.has(n)),
  ...root.filter(([n]) => !semantic.has(n) && !toTheme(n)),
];

const lines = (list, indent) => list.map(([n, v]) => `${indent}${n}: ${v};`).join('\n');

const generated = `/* Polaris design tokens. Generated from References/design.md section 10 by polaris-ui/scripts/sync-tokens.mjs. Do not edit the generated blocks; change the spec and re-run the script. */

/* Primitives, radius, shadow, fonts, type roles, breakpoints: @theme makes them Tailwind utilities and emits CSS variables. */
@theme {
${lines(themeDecls, '  ')}
}

/* Semantic tokens, spacing, motion, type scale (raw variables, light default) */
:root {
${lines(rootDecls, '  ')}
}

@media (prefers-color-scheme: dark) {
  :root {
${lines(dark, '    ')}
  }
}
`;

// 3. Keep the hand-maintained tail.
let current = '';
try {
  current = readFileSync(OUT, 'utf8');
} catch {
  fail(`${OUT} not found; it must exist and contain the hand-maintained marker`);
}
const markerAt = current.indexOf(HAND_MARKER);
if (markerAt < 0) fail('hand-maintained marker missing from tokens.css');
const tail = current.slice(markerAt);
const next = `${generated}\n${tail}`;

if (check) {
  if (next !== current) {
    const a = current.split('\n');
    const b = next.split('\n');
    const i = a.findIndex((line, k) => line !== b[k]);
    fail(`tokens.css drifts from design_spec §10 (first difference at line ${i + 1}: "${a[i] ?? ''}" should be "${b[i] ?? ''}"). Run: node scripts/sync-tokens.mjs`);
  }
  console.log(`sync-tokens: tokens.css matches design_spec §10 (${root.length} :root, ${dark.length} dark declarations).`);
} else {
  writeFileSync(OUT, next);
  console.log(`sync-tokens: wrote tokens.css (${root.length} :root, ${dark.length} dark declarations).`);
}
