#!/usr/bin/env node
'use strict';

/**
 * Fenced-code content linter for the Calimero skills.
 *
 * The structure test (`test.js`) checks that files EXIST. This checks that the
 * commands and imports inside fenced code blocks are still CORRECT against the
 * current Calimero release — the class of drift that prettier/markdownlint
 * cannot see. Each rule was seeded from a real bug found in the 0.11 content
 * audit, so a regression of any of them fails CI instead of silently shipping.
 *
 * Scope: only fenced code blocks (```bash / ```rust / ```typescript / …) are
 * checked — never prose. Comment lines and trailing inline comments are
 * stripped first, so a note like "there is no --view flag" never trips a rule.
 *
 * Intentional counter-examples (a "Don't do this" block) opt out with an HTML
 * comment on the line immediately before the opening fence:
 *
 *   <!-- validate-ignore: no-view-flag (intentional WRONG example) -->
 *   ```bash
 *   meroctl call <ctx> get --view   # shown as the wrong way
 *   ```
 *
 * `validate-ignore` with no rule list skips every rule for that block.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

const BASH = ['bash', 'sh', 'shell', 'console'];
const TS = ['ts', 'tsx', 'js', 'jsx', 'typescript', 'javascript'];
const RUST = ['rust', 'rs'];

/**
 * Each rule: { id, langs, check(logicalLine) -> bool (true = violation), message }
 * `check` receives a comment-stripped logical line (bash continuations joined).
 */
const RULES = [
  {
    id: 'no-call-as',
    langs: BASH,
    check: (l) => /\bmeroctl\b.*\bcall\b/.test(l) && /\s--as\b/.test(l),
    message:
      '`meroctl call` has no --as flag — the executor comes from the auth token. (--as is valid on `context create` / `context update`, not `call`.)',
  },
  {
    id: 'no-view-flag',
    langs: BASH,
    check: (l) => /\bmeroctl\b.*\bcall\b/.test(l) && /\s--view\b/.test(l),
    message:
      '`meroctl call` has no --view flag — a view is just a read-only method (same call form).',
  },
  {
    id: 'context-create-group-id',
    langs: BASH,
    // `context create` but NOT `context create-group` (the `(?!-)` guards the
    // substring case — `create` must be a whole word, not the prefix of `create-group`).
    check: (l) => /\bmeroctl\b.*\bcontext\s+create\b(?!-)/.test(l) && !/--group-id\b/.test(l),
    message:
      '`meroctl context create` requires --group-id (a context is bound to a group; pass the namespace-id from `namespace create`).',
  },
  {
    id: 'no-deprecated-client',
    langs: TS,
    check: (l) => /['"]@calimero-network\/calimero-client['"]/.test(l),
    message:
      'The `@calimero-network/calimero-client` package is deprecated/forbidden — use `@calimero-network/mero-js` (+ `mero-react`).',
  },
];

const RULES_BY_ID = Object.fromEntries(RULES.map((r) => [r.id, r]));

/** Strip a comment line / trailing inline comment for the given language family. */
function stripComment(line, langFamily) {
  if (langFamily === 'bash') {
    if (/^\s*#/.test(line)) return '';
    // remove a trailing " # ..." comment (space-hash) — leaves "#" inside quotes alone
    return line.replace(/\s#\s.*$/, '');
  }
  // ts / rust
  if (/^\s*\/\//.test(line)) return '';
  return line.replace(/\s\/\/\s.*$/, '');
}

function langFamilyOf(lang) {
  if (BASH.includes(lang)) return 'bash';
  if (TS.includes(lang)) return 'ts';
  if (RUST.includes(lang)) return 'rust';
  return null;
}

/** Collect markdown files recursively. */
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith('.md')) out.push(p);
  }
  return out;
}

const violations = [];
let blocksChecked = 0;

/**
 * Evaluate one collected code block against the applicable rules.
 * Shared by the closing-fence path and the end-of-file (unclosed block) path.
 */
function evaluateBlock({ rel, lang, family, startLine, ignore, buf }) {
  if (!family || ignore === 'ALL') return;
  const applicable = RULES.filter(
    (r) => r.langs.includes(lang) && !(ignore instanceof Set && ignore.has(r.id))
  );
  if (!applicable.length) return;
  blocksChecked++;

  // build logical lines (join bash continuations), strip comments
  const logical = [];
  let acc = '';
  for (const raw of buf) {
    const stripped = stripComment(raw, family);
    // Test the STRIPPED line for the trailing backslash (consistent with what we
    // accumulate) — a `cmd \  # note` line is a comment, not a real continuation.
    if (family === 'bash' && /\\\s*$/.test(stripped)) {
      acc += stripped.replace(/\\\s*$/, ' ');
      continue;
    }
    logical.push(acc + stripped);
    acc = '';
  }
  if (acc) logical.push(acc);

  for (const ll of logical) {
    if (!ll.trim()) continue;
    for (const r of applicable) {
      if (r.check(ll)) {
        violations.push({ file: rel, block: startLine, rule: r.id, line: ll.trim() });
      }
    }
  }
}

const allFiles = walk(SKILLS_DIR);

for (const file of allFiles) {
  const rel = path.relative(ROOT, file);
  const lines = fs.readFileSync(file, 'utf8').split('\n');

  let inBlock = false;
  let lang = '';
  let family = null;
  let startLine = 0;
  let ignore = null; // null = check all; Set = skip these rule ids; 'ALL' = skip block
  let buf = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // CommonMark allows fences indented up to 3 spaces — match opening and
    // closing the SAME way so an indented closing fence isn't missed.
    const fence = line.match(/^\s{0,3}```(\w+)?/);

    if (!inBlock && fence) {
      inBlock = true;
      lang = (fence[1] || '').toLowerCase();
      family = langFamilyOf(lang);
      startLine = i + 1;
      buf = [];
      // look back for an ignore marker on the immediately-preceding non-blank line
      let j = i - 1;
      while (j >= 0 && lines[j].trim() === '') j--;
      ignore = null;
      if (j >= 0) {
        const m = lines[j].match(/<!--\s*validate-ignore:?\s*([^>]*?)\s*-->/);
        if (m) {
          const rest = (m[1] || '').trim();
          const ids = rest
            .replace(/\(.*?\)/g, '')
            .split(/[\s,]+/)
            .filter(Boolean);
          ignore = ids.length ? new Set(ids) : 'ALL';
        }
      }
      continue;
    }

    if (inBlock && /^\s{0,3}```\s*$/.test(line)) {
      evaluateBlock({ rel, lang, family, startLine, ignore, buf });
      inBlock = false;
      family = null;
      continue;
    }

    if (inBlock) buf.push(line);
  }

  // A fenced block left open at EOF would otherwise be dropped silently —
  // evaluate it so a violation on the file's last block is never missed.
  if (inBlock) {
    console.warn(`  ! ${rel}: unclosed code fence at end of file — evaluating partial block`);
    evaluateBlock({ rel, lang, family, startLine, ignore, buf });
  }
}

console.log(
  `\nContent linter: scanned fenced code blocks in ${allFiles.length} markdown files (${blocksChecked} blocks matched a rule's language).\n`
);

if (violations.length === 0) {
  console.log('  ✓ no content-rule violations\n');
  process.exit(0);
}

const byRule = {};
for (const v of violations) (byRule[v.rule] ||= []).push(v);

for (const [ruleId, vs] of Object.entries(byRule)) {
  console.error(`✗ ${ruleId} — ${RULES_BY_ID[ruleId].message}`);
  for (const v of vs) {
    console.error(`    ${v.file} (block @L${v.block}):  ${v.line}`);
  }
  console.error('');
}

console.error(
  `${violations.length} content-rule violation(s) across ${Object.keys(byRule).length} rule(s).`
);
console.error('Fix the command/import, or — if this is a deliberate counter-example — add');
console.error('`<!-- validate-ignore: <rule-id> -->` on the line before the code fence.\n');
process.exit(1);
