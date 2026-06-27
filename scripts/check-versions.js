#!/usr/bin/env node
'use strict';

/**
 * Version-pin checker for the Calimero skills.
 *
 * Nothing is hardcoded — the "expected" version is DERIVED from the skill pins
 * themselves and validated against the live upstream release. Two checks:
 *
 *  1. Consistency (offline, always; part of `npm test`). Every core pin across
 *     the skills must agree with the others. Catches the case where one skill
 *     is bumped and another is forgotten.
 *
 *  2. Freshness (online, CHECK_LATEST_CORE=1; the version-watch workflow).
 *     The (single, consistent) pinned version must equal the latest
 *     calimero-network/core release tag, fetched at run time. Catches the case
 *     where core cuts a newer rc and the skills still teach the old one.
 *
 * To move to a new release you just edit the pins in the skill files — there is
 * no separate constant to keep in sync.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

// A *core* pin is unambiguous: it is the version attached to a calimero-network/core
// git-tag dependency, or to a calimero core crate's crates.io version. This is how
// we tell a real core pin apart from unrelated versions (npm ^0.1.0,
// minRuntimeVersion 0.1.0, .mpk filenames) without guessing by number shape.
const CORE_CRATES = '(?:calimero-sdk|calimero-storage|calimero-storage-macros|calimero-wasm-abi)';
const CORE_PIN_RES = [
  // { git = "…/calimero-network/core", tag = "0.11.0-rc.8" }
  /calimero-network\/core"\s*,\s*tag\s*=\s*"(\d[^"]*)"/g,
  // calimero-sdk = "0.11.0-rc.8"   (crates.io form). Require a version-shaped value
  // (leading digit) so `{ workspace = true }` / path deps don't get captured as pins.
  new RegExp(`${CORE_CRATES}\\s*=\\s*"(\\d[^"]*)"`, 'g'),
];

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

function compareRc(a, b) {
  // compare "X.Y.Z" or "X.Y.Z-rc.N"; returns -1/0/1
  const parse = (v) => {
    const [base, rc] = v.split('-rc.');
    const nums = base.split('.').map(Number);
    nums.push(rc === undefined ? Infinity : Number(rc)); // final > any rc
    return nums;
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

// ── Collect every core pin (version → occurrences) ──
const pins = new Map(); // version -> [{file, line, text}]
for (const file of walk(SKILLS_DIR)) {
  const rel = path.relative(ROOT, file);
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    for (const re of CORE_PIN_RES) {
      re.lastIndex = 0;
      for (const m of line.matchAll(re)) {
        const v = m[1];
        if (!pins.has(v)) pins.set(v, []);
        pins.get(v).push({ file: rel, line: idx + 1, text: line.trim() });
      }
    }
  });
}

const distinct = [...pins.keys()];
const total = [...pins.values()].reduce((n, occ) => n + occ.length, 0);
let failed = false;

console.log(`\nVersion-pin check: found ${total} core pin(s) across the skills.\n`);

// ── 1. Consistency: all pins must agree ──
if (distinct.length === 0) {
  console.warn('  ! no core pins found — nothing to check\n');
} else if (distinct.length === 1) {
  console.log(`  ✓ all ${total} core pin(s) agree on ${distinct[0]}\n`);
} else {
  failed = true;
  console.error(`✗ core pins disagree — ${distinct.length} different versions in use:`);
  for (const [v, occ] of pins) {
    console.error(`    ${v}:`);
    for (const o of occ) console.error(`      ${o.file}:${o.line}  ${o.text}`);
  }
  console.error('\n  Make every core pin the same version.\n');
}

// The version the skills currently target (only meaningful when consistent).
const pinned = distinct.length === 1 ? distinct[0] : null;

// ── 2. Freshness (opt-in): is `pinned` the latest core release? ──
function fetchTagsPage(page) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: `/repos/calimero-network/core/tags?per_page=100&page=${page}`,
      headers: {
        'User-Agent': 'calimero-skills-version-check',
        Accept: 'application/vnd.github+json',
      },
    };
    if (process.env.GITHUB_TOKEN) opts.headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB cap — one tags page is ~tens of KB

    // single-settle guard: the first resolve/reject wins; later stream events
    // (e.g. an `end` that fires after `destroy()`) become no-ops.
    let settled = false;
    let req;
    const done = (fn, arg) => {
      if (settled) return;
      settled = true;
      if (req) req.destroy();
      fn(arg);
    };

    req = https
      .get(opts, (res) => {
        const chunks = [];
        let bytes = 0;
        res.on('data', (c) => {
          if (settled) return;
          // count raw bytes and stop BEFORE growing past the cap
          bytes += c.length;
          if (bytes > MAX_BYTES)
            return done(reject, new Error('GitHub API response exceeded size cap'));
          chunks.push(c);
        });
        res.on('end', () => {
          if (settled) return;
          const body = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode !== 200)
            return done(reject, new Error(`GitHub API ${res.statusCode}: ${body.slice(0, 200)}`));
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch (e) {
            return done(reject, e);
          }
          // A 200 can still carry an error object (e.g. rate limit) — surface it
          // instead of silently treating a non-array as "no tags".
          if (!Array.isArray(parsed)) {
            return done(
              reject,
              new Error(`GitHub API returned non-array: ${parsed?.message ?? body.slice(0, 200)}`)
            );
          }
          done(resolve, parsed);
        });
      })
      .on('error', (err) => done(reject, err));
  });
}

// The tags endpoint has no guaranteed order, so we page through ALL tags (not
// just the first 100) and take the max — otherwise a newer rc beyond page 1
// could be missed. Capped at 10 pages (1000 tags) as a safety bound.
async function fetchLatestCoreTag() {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await fetchTagsPage(page);
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break; // last page
  }
  // core release tags look like 0.11.0-rc.8 (optionally v-prefixed).
  const tags = all
    .map((t) => t.name.replace(/^v/, ''))
    .filter((n) => /^\d+\.\d+\.\d+(?:-rc\.\d+)?$/.test(n));
  if (!tags.length) throw new Error('no core release tags found');
  tags.sort(compareRc);
  return tags[tags.length - 1];
}

async function main() {
  if (process.env.CHECK_LATEST_CORE === '1' && pinned) {
    try {
      const latest = await fetchLatestCoreTag();
      console.log(`Latest core release tag: ${latest}  (skills pin ${pinned})`);
      if (compareRc(pinned, latest) < 0) {
        failed = true;
        console.error(
          `\n✗ core has cut a newer release (${latest}) than the skills pin (${pinned}).`
        );
        console.error('  Update the core pins in the skill files to the new release and re-audit');
        console.error('  the skill content against it.\n');
      } else {
        console.log(`  ✓ ${pinned} is current (>= latest core tag)\n`);
      }
    } catch (e) {
      // Network/rate-limit failures must not break the offline consistency gate.
      console.warn(`  ! skipped latest-core check (${e.message})\n`);
    }
  }
  process.exit(failed ? 1 : 0);
}

main();
