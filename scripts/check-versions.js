#!/usr/bin/env node
'use strict';

/**
 * Version-pin checker for the Calimero skills.
 *
 * The skills pin the Rust SDK / core crates to a specific Calimero release
 * (e.g. `0.11.0-rc.6`). Two ways those pins go stale:
 *
 *  1. Internal drift — one skill is bumped, another is forgotten, so the docs
 *     contradict each other. (Always checked, offline, deterministic.)
 *  2. Upstream drift — `calimero-network/core` cuts a newer rc and the skills
 *     still teach the old one. (Checked when CHECK_LATEST_CORE=1, which queries
 *     the GitHub API — intended for a dedicated CI job that has network.)
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BUMP THIS when core cuts a new release, then update the pins it reports.
 */
const EXPECTED_CORE_VERSION = '0.11.0-rc.6';
// ─────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

// Matches a full SemVer-ish version, e.g. 0.11.0-rc.6 / 0.11.0 / 0.1.0.
// Bare "0.11" feature-version mentions ("0.11 additions") are intentionally NOT
// matched — they are stable across rc bumps and must not trip the checker.
const PIN_RE = /\b\d+\.\d+\.\d+(?:-rc\.\d+)?\b/g;
// A *core* pin is one on EXPECTED's major.minor line (e.g. "0.11."). This keeps
// unrelated versions out — npm package pins (^0.1.0), minRuntimeVersion (0.1.0),
// .mpk filenames (myapp-0.1.0.mpk) all live on other lines and are ignored.
const CORE_PREFIX = EXPECTED_CORE_VERSION.split('.').slice(0, 2).join('.') + '.'; // "0.11."
const isCorePin = (v) => v.startsWith(CORE_PREFIX);

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
  // compare two "X.Y.Z" or "X.Y.Z-rc.N" strings; returns -1/0/1
  const parse = (v) => {
    const [base, rc] = v.split('-rc.');
    const nums = base.split('.').map(Number);
    // a release with no -rc is NEWER than its rc (rc.∞ < final)
    nums.push(rc === undefined ? Infinity : Number(rc));
    return nums;
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

// ── 1. Offline: every core pin in the skills must equal EXPECTED_CORE_VERSION ──
const drift = [];
let pinCount = 0;
for (const file of walk(SKILLS_DIR)) {
  const rel = path.relative(ROOT, file);
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    for (const m of line.matchAll(PIN_RE)) {
      const v = m[0];
      if (!isCorePin(v)) continue;
      pinCount++;
      if (v !== EXPECTED_CORE_VERSION) {
        drift.push({ file: rel, line: idx + 1, found: v, text: line.trim() });
      }
    }
  });
}

console.log(`\nVersion-pin check: expected core version = ${EXPECTED_CORE_VERSION}`);
console.log(`Scanned skills, found ${pinCount} core pin(s).\n`);

let failed = false;
if (drift.length) {
  failed = true;
  console.error(`✗ ${drift.length} pin(s) do not match ${EXPECTED_CORE_VERSION}:`);
  for (const d of drift) console.error(`    ${d.file}:${d.line}  found ${d.found}  —  ${d.text}`);
  console.error('\n  Update these pins, or bump EXPECTED_CORE_VERSION if the whole set moved.\n');
} else {
  console.log(`  ✓ all ${pinCount} core pin(s) match ${EXPECTED_CORE_VERSION}\n`);
}

// ── 2. Online (opt-in): is EXPECTED_CORE_VERSION still the latest core release? ──
function fetchLatestCoreTag() {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: '/repos/calimero-network/core/tags?per_page=100',
      headers: {
        'User-Agent': 'calimero-skills-version-check',
        Accept: 'application/vnd.github+json',
      },
    };
    if (process.env.GITHUB_TOKEN) opts.headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    https
      .get(opts, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode !== 200)
            return reject(new Error(`GitHub API ${res.statusCode}: ${body.slice(0, 200)}`));
          try {
            const tags = JSON.parse(body)
              .map((t) => t.name.replace(/^v/, ''))
              .filter(isCorePin);
            if (!tags.length) return reject(new Error('no core release tags found'));
            tags.sort(compareRc);
            resolve(tags[tags.length - 1]);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

async function main() {
  if (process.env.CHECK_LATEST_CORE === '1') {
    try {
      const latest = await fetchLatestCoreTag();
      console.log(`Latest core tag on GitHub: ${latest}`);
      if (compareRc(EXPECTED_CORE_VERSION, latest) < 0) {
        failed = true;
        console.error(
          `\n✗ core has cut a newer release (${latest}) than the skills pin (${EXPECTED_CORE_VERSION}).`
        );
        console.error(
          '  Bump EXPECTED_CORE_VERSION in scripts/check-versions.js and update the pins it lists,'
        );
        console.error('  re-verifying skill content against the new release.\n');
      } else {
        console.log(`  ✓ ${EXPECTED_CORE_VERSION} is current (>= latest core tag)\n`);
      }
    } catch (e) {
      // Network/rate-limit failures must not break the offline gate.
      console.warn(`  ! skipped latest-core check (${e.message})\n`);
    }
  }
  process.exit(failed ? 1 : 0);
}

main();
