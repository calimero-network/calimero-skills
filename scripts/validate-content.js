#!/usr/bin/env node
'use strict';

/**
 * Fenced-code content linter for the Calimero skills.
 *
 * The structure test (`test.js`) checks that files EXIST. This checks that the
 * commands and imports inside fenced code blocks are still CORRECT against the
 * current Calimero release (core 1.0) — the class of drift that
 * prettier/markdownlint cannot see. The meroctl rules flag the 0.x CLI forms
 * (`--group-id`, `context identity`, `peers`, a JSON-RPC call envelope,
 * merobox, a positional `call` context), so a regression fails CI instead of
 * silently shipping.
 *
 * Scope: only fenced code blocks (```bash / ```rust / ```typescript / …) are
 * checked — never prose. Comment lines and trailing inline comments are
 * stripped first, so a note like "0.x needed --group-id" never trips a rule.
 *
 * Intentional counter-examples (a "Don't do this" block) opt out with an HTML
 * comment on the line immediately before the opening fence:
 *
 *   <!-- validate-ignore: no-group-id (intentional WRONG example) -->
 *   ```bash
 *   meroctl context create --name kv --group-id <ns>   # shown as the wrong way
 *   ```
 *
 * `validate-ignore` with no rule list skips every rule for that block.
 *
 * Skills the root SKILL.md lists as not yet updated to core 1.0 (STALE_SKILLS)
 * still teach 0.x commands; their violations are printed as warnings and do not
 * fail the run, so the drift stays visible until each skill is rewritten and
 * taken off the list. Every other skill must pass.
 *
 * `node scripts/validate-content.js` first runs the rules over SELF_TESTS (lines
 * each rule must flag, and correct 1.0 lines no rule may flag), so a rule that
 * stops matching, or starts matching correct code, fails before any file is read.
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
// A `meroctl` command line, wherever it sits on the logical line (`X=$(meroctl …)`, after `&&`).
const MEROCTL = /\bmeroctl\b/;
// `meroctl … call …` (the `call` subcommand, not a `--call`-ish flag or a method named `call_x`).
const MEROCTL_CALL = /\bmeroctl\b(?:\s+--?[\w-]+(?:[\s=](?!-)\S+)?)*\s+call\b(?!-)/;
// `meroctl … context create …` but NOT `context create-group` (`create` must be a whole word).
const CONTEXT_CREATE = /\bmeroctl\b.*\bcontext\s+create\b(?!-)/;

const RULES = [
  {
    id: 'no-call-as',
    langs: BASH,
    check: (l) => MEROCTL_CALL.test(l) && /\s--as\b/.test(l),
    message:
      '`meroctl call` has no --as flag: a call runs as the signed-in account (its session or `--api-key`).',
  },
  {
    id: 'call-needs-context',
    langs: BASH,
    check: (l) => MEROCTL_CALL.test(l) && !/\s(?:-c|--context)(?:\s|=)/.test(l),
    message:
      '`meroctl call` takes the context as `-c`/`--context` (`meroctl call -c CONTEXT METHOD --args JSON [--view]`); a positional context is the 0.x form.',
  },
  {
    id: 'no-group-id',
    langs: BASH,
    check: (l) => MEROCTL.test(l) && /\s--group-id\b/.test(l),
    message:
      'core 1.0 has no --group-id: `context create` takes `--namespace ORG [--group TEAM]` (or neither, for your personal organization).',
  },
  {
    id: 'context-create-application-id',
    langs: BASH,
    check: (l) => CONTEXT_CREATE.test(l) && /\s--application-id\b/.test(l),
    message:
      '`meroctl context create` takes `--package P [--version V]`, `--bundle HASH` or `--path FILE`, not --application-id (0.x).',
  },
  {
    id: 'context-create-needs-name',
    langs: BASH,
    check: (l) => CONTEXT_CREATE.test(l) && !/\s--name(?:\s|=)/.test(l),
    message:
      '`meroctl context create` requires --name (`context create --name NAME (--package P | --bundle HASH | --path FILE)`).',
  },
  {
    id: 'no-0x-commands',
    langs: BASH,
    check: (l) =>
      /\bmeroctl\b.*\b(?:context\s+identity|context\s+sync|group\s+sync|group\s+join-context|node\s+identity)\b/.test(
        l
      ) || /\bmeroctl(?:\s+--?[\w-]+(?:[\s=](?!-)\S+)?)*\s+(?:peers|identity)\b(?!-)/.test(l),
    message:
      'Gone in core 1.0: `context identity` (accounts and passkeys replace identities), `peers` (no gossip), `context sync`/`group sync` (Raft replicates), `group join-context` (an org member reaches its contexts).',
  },
  {
    id: 'no-jsonrpc-envelope',
    langs: BASH,
    check: (l) => /\\?["']jsonrpc\\?["']\s*:/.test(l) || /\/jsonrpc\b/.test(l),
    message:
      'core 1.0 has no JSON-RPC endpoint: call a method with `meroctl call -c CONTEXT METHOD --args JSON [--view]` (`POST /apps/{app}/intents` or `/views`).',
  },
  {
    id: 'no-merobox',
    langs: BASH,
    check: (l) =>
      /(?:^|[\s;&|(`])merobox(?:\s|$)/.test(l) || /\binstall\b.*(?:^|\s)merobox\b/.test(l),
    message:
      "merobox is gone in core 1.0: `meroctl local up|dev|test` runs a development cluster and an app's scenarios.",
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

/**
 * Skills not yet rewritten for core 1.0 (the list in the root SKILL.md). Their
 * violations warn instead of failing; take a skill off when it is rewritten.
 */
const STALE_SKILLS = new Set([
  'calimero-core',
  'calimero-node',
  'calimero-merod',
  'calimero-sdk-js',
  'calimero-desktop',
  'calimero-client-py',
]);

/**
 * Rule fixtures: `bad` lines must trip exactly the rule named; `good` lines are
 * correct core 1.0 commands (taken from core's meroctl reference) that no rule
 * may flag.
 */
const SELF_TESTS = {
  bad: [
    ['no-call-as', "meroctl call -c kv set --args '{}' --as alice"],
    ['call-needs-context', 'meroctl call <ctx-id> get --args \'{"key":"a"}\''],
    ['call-needs-context', 'meroctl --node node1 call get_posts'],
    ['no-group-id', 'meroctl context create --name kv --package com.example.kv --group-id <ns>'],
    ['no-group-id', 'meroctl namespace create-group <ns> eng --group-id <g>'],
    ['context-create-application-id', 'meroctl context create --name kv --application-id <app-id>'],
    ['context-create-needs-name', 'meroctl context create --package com.example.kv'],
    ['no-0x-commands', 'meroctl context identity generate --context <ctx>'],
    ['no-0x-commands', 'meroctl --node node1 peers'],
    ['no-0x-commands', 'meroctl context sync <ctx>'],
    ['no-0x-commands', 'meroctl --node node2 group join-context <ctx>'],
    [
      'no-jsonrpc-envelope',
      'curl -X POST http://localhost:2528/jsonrpc -d \'{"jsonrpc":"2.0","method":"execute"}\'',
    ],
    ['no-merobox', 'merobox run --nodes 2'],
    ['no-merobox', 'pip install merobox'],
  ],
  good: [
    'meroctl call --context kv get --args \'{"key":"a"}\' --view',
    'meroctl call -c notes set --args \'{"key":"a","value":"1"}\'',
    'meroctl call -c my-kv len --view --min-index 7',
    'meroctl context create --name kv --path app.wasm',
    'meroctl context create --path kv_store.wasm --name kv --alias kv',
    "meroctl context create --name team-kv --package com.example.kv --namespace <org-id> --group <team> --params '{}'",
    'meroctl namespace create-group <org-id> eng --join open',
    'meroctl namespace invite <org-id> --role member --group <team> --uses 1',
    'meroctl --api-key "$CALIMERO_API_KEY" --tee-profiles prod --min-release 2.3.109 whoami',
    'meroctl node add local http://127.0.0.1:2501 --allow-mock',
    'meroctl login --dev-passkey ./dev-passkey.json --name ada',
    'meroctl local up --fresh',
    'meroctl app install com.example.kv@1.0.0',
    'cat ~/.merobox/auth_cache/node.json',
    'meroctl account api-key create --context kv --read-only --dev-passkey ./dev-passkey.json',
  ],
};

function runSelfTests() {
  const failures = [];
  for (const [id, line] of SELF_TESTS.bad) {
    const hits = RULES.filter((r) => r.langs === BASH && r.check(line)).map((r) => r.id);
    if (!hits.includes(id)) failures.push(`rule ${id} does not flag: ${line}`);
  }
  for (const line of SELF_TESTS.good) {
    const hits = RULES.filter((r) => r.langs === BASH && r.check(line)).map((r) => r.id);
    if (hits.length) failures.push(`${hits.join(', ')} flags correct 1.0 code: ${line}`);
  }
  const n = SELF_TESTS.bad.length + SELF_TESTS.good.length;
  if (failures.length) {
    for (const f of failures) console.error(`  ✗ self-test: ${f}`);
    console.error(`\n${failures.length} of ${n} rule self-test(s) failed.\n`);
    process.exit(1);
  }
  console.log(`\nContent linter: ${n} rule self-tests pass.`);
}

runSelfTests();

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

const skillOf = (file) => file.split(path.sep)[1];
const warnings = violations.filter((v) => STALE_SKILLS.has(skillOf(v.file)));
const failures = violations.filter((v) => !STALE_SKILLS.has(skillOf(v.file)));

function report(list, out) {
  const byRule = {};
  for (const v of list) (byRule[v.rule] ||= []).push(v);
  for (const [ruleId, vs] of Object.entries(byRule)) {
    out(`${list === failures ? '✗' : '!'} ${ruleId} — ${RULES_BY_ID[ruleId].message}`);
    for (const v of vs) out(`    ${v.file} (block @L${v.block}):  ${v.line}`);
    out('');
  }
  return Object.keys(byRule).length;
}

if (warnings.length) {
  console.warn(
    `  ! ${warnings.length} violation(s) in skills not yet updated to core 1.0 (STALE_SKILLS), not failing:\n`
  );
  report(warnings, console.warn);
}

if (failures.length === 0) {
  console.log('  ✓ no content-rule violations\n');
  process.exit(0);
}

const nRules = report(failures, console.error);
console.error(`${failures.length} content-rule violation(s) across ${nRules} rule(s).`);
console.error('Fix the command/import, or — if this is a deliberate counter-example — add');
console.error('`<!-- validate-ignore: <rule-id> -->` on the line before the code fence.\n');
process.exit(1);
