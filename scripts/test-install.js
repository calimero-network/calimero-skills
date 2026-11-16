#!/usr/bin/env node
'use strict';

/**
 * Tests for the installer (scripts/install.js): the skill frontmatter, the Claude Code
 * skills target, sets, re-runs, and the unchanged CLAUDE.md / Cursor / Copilot blocks.
 * Every install runs in a fresh temp directory.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const yaml = require('js-yaml');
const install = require('./install');

const ROOT = path.join(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');
const BIN = path.join(__dirname, 'install.js');
const SKILLS = install.VALID_SKILLS;
const APP = [
  'calimero-core',
  'calimero-rust-sdk',
  'calimero-client-js',
  'calimero-meroctl',
  'calimero-abi-codegen',
  'calimero-registry',
];

let passed = 0;
let failed = 0;
function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}
function section(name, fn) {
  const before = failed;
  fn();
  console.log(`  ${failed === before ? '✓' : '✗'} ${name}`);
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'calimero-skills-test-'));
let tmpCount = 0;
function tmpDir() {
  const d = path.join(tmpRoot, String(tmpCount++));
  fs.mkdirSync(d);
  return d;
}

function cli(args, cwd, env = {}) {
  return spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

/** Splits `---\n<yaml>\n---\n<body>` with a full YAML parser. */
function splitFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) return null;
  return { data: yaml.load(m[1]), body: text.slice(m[0].length) };
}

/** Every file under dir, as { relative path: contents }. */
function snapshot(dir) {
  const out = {};
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out[path.relative(dir, p)] = fs.readFileSync(p, 'utf8');
    }
  })(dir);
  return out;
}

const listMd = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.md'))
        .sort()
    : [];

console.log('\nInstaller tests\n');

section('every skills/<name>/SKILL.md has YAML frontmatter with its name and a description', () => {
  for (const s of SKILLS) {
    const text = fs.readFileSync(path.join(SKILLS_DIR, s, 'SKILL.md'), 'utf8');
    let fm = null;
    try {
      fm = splitFrontmatter(text);
    } catch (err) {
      assert(false, `${s}: frontmatter is not valid YAML (${err.message})`);
      continue;
    }
    assert(fm && fm.data && typeof fm.data === 'object', `${s}: has frontmatter`);
    if (!fm || !fm.data) continue;
    assert(fm.data.name === s, `${s}: frontmatter name matches the directory`);
    assert(/^[a-z0-9-]{1,64}$/.test(fm.data.name || ''), `${s}: name is lowercase-hyphenated`);
    const d = fm.data.description;
    assert(typeof d === 'string' && d.length >= 40, `${s}: description is a sentence`);
    assert(typeof d === 'string' && d.length <= 1024, `${s}: description is at most 1024 chars`);
    assert(typeof d === 'string' && !d.includes('\n'), `${s}: description is one line`);
    assert(/\bUse (when|for|whenever)\b/.test(d || ''), `${s}: description says when to use it`);
    // The installer's own frontmatter reader agrees with a full YAML parser.
    const mine = install.parseSkillMd(text);
    assert(
      mine.fields.name === fm.data.name && mine.fields.description === fm.data.description,
      `${s}: installer reads the same frontmatter as js-yaml`
    );
    assert(mine.body === fm.body, `${s}: installer splits the same body as js-yaml`);
  }
});

section('every skill installs to .claude/skills with valid frontmatter and its files', () => {
  const cwd = tmpDir();
  install.run(SKILLS, { cwd, log: () => {} });
  const base = path.join(cwd, '.claude', 'skills');
  assert(
    JSON.stringify(fs.readdirSync(base).sort()) === JSON.stringify(SKILLS),
    'one directory per skill, nothing else'
  );
  for (const s of SKILLS) {
    const dir = path.join(base, s);
    const src = path.join(SKILLS_DIR, s);
    const text = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
    const fm = splitFrontmatter(text);
    const source = splitFrontmatter(fs.readFileSync(path.join(src, 'SKILL.md'), 'utf8'));
    assert(fm && fm.data.name === s, `${s}: generated name`);
    assert(
      fm && fm.data.description === source.data.description,
      `${s}: generated description is the source's`
    );
    assert(fm && Object.keys(fm.data).length === 2, `${s}: frontmatter is name + description`);
    assert(fm && fm.body.includes(source.body.trim()), `${s}: body is the source SKILL.md body`);
    assert(fm && !/^---\nname:/m.test(fm.body), `${s}: the body carries no second frontmatter`);

    const files = [];
    for (const sub of ['references', 'rules']) {
      for (const f of listMd(path.join(src, sub))) {
        files.push(`${sub}/${f}`);
        const copy = path.join(dir, sub, f);
        assert(
          fs.existsSync(copy) &&
            fs.readFileSync(copy, 'utf8') === fs.readFileSync(path.join(src, sub, f), 'utf8'),
          `${s}: ${sub}/${f} copied unchanged`
        );
      }
    }
    // Claude can find every reference and rule from SKILL.md, by path or in the index.
    for (const f of files) assert(text.includes(f), `${s}: SKILL.md names ${f}`);
    // Every relative path SKILL.md names resolves from its new location.
    const named = [
      ...text.matchAll(/\]\((?!https?:|#|mailto:)([^)\s#]+)/g),
      ...text.matchAll(/`((?:references|rules)\/[\w./-]+\.md)`/g),
    ].map((m) => m[1]);
    for (const rel of named) {
      assert(fs.existsSync(path.join(dir, rel)), `${s}: link ${rel} resolves`);
    }
  }
});

section('`app` installs the starter set and `all` every skill', () => {
  assert(JSON.stringify(install.resolveSkills(['app'])) === JSON.stringify(APP), 'app expands');
  assert(
    JSON.stringify(install.resolveSkills(['all'])) === JSON.stringify(SKILLS),
    'all expands to every skill'
  );
  for (const s of APP) assert(SKILLS.includes(s), `starter skill ${s} exists`);
  assert(
    JSON.stringify(install.resolveSkills(['calimero-core', 'app', 'calimero-core'])) ===
      JSON.stringify(APP),
    'names are deduplicated'
  );

  const appCwd = tmpDir();
  const r = cli(['app', '--claude-skills'], appCwd);
  assert(r.status === 0, `\`app --claude-skills\` exits 0 (${r.stderr})`);
  const got = fs.readdirSync(path.join(appCwd, '.claude', 'skills')).sort();
  assert(JSON.stringify(got) === JSON.stringify([...APP].sort()), `app installs ${APP}`);

  const allCwd = tmpDir();
  assert(cli(['all', '--cursor'], allCwd).status === 0, '`all --cursor` exits 0');
  const rules = fs.readFileSync(path.join(allCwd, '.cursorrules'), 'utf8');
  for (const s of SKILLS) {
    assert(rules.includes(`<!-- calimero-skills:${s} -->`), `all --cursor writes ${s}`);
  }

  const several = tmpDir();
  assert(
    cli(['calimero-core', 'calimero-meroctl', '--copilot'], several).status === 0,
    'several names exit 0'
  );
  const cop = fs.readFileSync(path.join(several, '.github', 'copilot-instructions.md'), 'utf8');
  assert((cop.match(/<!-- calimero-skills:[\w-]+ -->(?!:end)/g) || []).length === 2, 'two blocks');
});

section('re-running replaces a skill directory cleanly (idempotent)', () => {
  const cwd = tmpDir();
  install.run(['app'], { cwd, log: () => {} });
  const first = snapshot(cwd);
  const stray = path.join(cwd, '.claude', 'skills', 'calimero-core', 'references', 'stale.md');
  fs.writeFileSync(stray, '# Removed from the skill');
  install.run(['app'], { cwd, log: () => {} });
  assert(!fs.existsSync(stray), 'a file the skill no longer has is removed');
  assert(JSON.stringify(snapshot(cwd)) === JSON.stringify(first), 'second run, same tree');
  const leftovers = fs.readdirSync(path.join(cwd, '.claude', 'skills')).filter((f) => f[0] === '.');
  assert(leftovers.length === 0, 'no temporary directories left');
  const other = path.join(cwd, '.claude', 'skills', 'my-own-skill');
  fs.mkdirSync(other);
  install.run(['calimero-core'], { cwd, log: () => {} });
  assert(fs.existsSync(other), "another skill's directory is left alone");
});

section('the default target is Claude Code skills; --global writes ~/.claude/skills', () => {
  const cwd = tmpDir();
  const home = tmpDir();
  assert(cli(['calimero-core'], cwd, { HOME: home }).status === 0, 'no flag exits 0');
  assert(
    fs.existsSync(path.join(cwd, '.claude', 'skills', 'calimero-core', 'SKILL.md')),
    'no flag writes .claude/skills'
  );
  assert(!fs.existsSync(path.join(cwd, 'CLAUDE.md')), 'no flag writes no CLAUDE.md');

  const g = tmpDir();
  const r = cli(['calimero-merod', '--global'], g, { HOME: home });
  assert(r.status === 0, `--global exits 0 (${r.stderr})`);
  assert(
    fs.existsSync(path.join(home, '.claude', 'skills', 'calimero-merod', 'SKILL.md')),
    '--global writes ~/.claude/skills'
  );
  assert(!fs.existsSync(path.join(g, '.claude')), '--global writes nothing in the project');
});

section('CLAUDE.md, Cursor and Copilot blocks are the skill text, without frontmatter', () => {
  // The blocks the pre-frontmatter installer wrote: SKILL.md, then references/, then
  // rules/, each trimmed, joined by `---` rules, between two markers.
  const expected = (s) => {
    const src = path.join(SKILLS_DIR, s);
    const parts = [splitFrontmatter(fs.readFileSync(path.join(src, 'SKILL.md'), 'utf8')).body];
    for (const sub of ['references', 'rules']) {
      for (const f of listMd(path.join(src, sub))) {
        parts.push(fs.readFileSync(path.join(src, sub, f), 'utf8'));
      }
    }
    const content = parts.map((p) => p.trim()).join('\n\n---\n\n');
    return `<!-- calimero-skills:${s} -->\n\n${content}\n\n<!-- calimero-skills:${s} -->:end`;
  };
  const files = {
    '--claude-md': 'CLAUDE.md',
    '--cursor': '.cursorrules',
    '--copilot': path.join('.github', 'copilot-instructions.md'),
  };
  for (const [flag, file] of Object.entries(files)) {
    const cwd = tmpDir();
    // An existing file gets the blocks appended; Copilot's (and .github/) is created.
    if (flag !== '--copilot') fs.writeFileSync(path.join(cwd, file), '# My project');
    assert(cli(['all', flag], cwd).status === 0, `all ${flag} exits 0`);
    const prefix = flag === '--copilot' ? '' : '# My project\n\n';
    const want = prefix + SKILLS.map(expected).join('\n\n');
    const got = fs.readFileSync(path.join(cwd, file), 'utf8');
    assert(got === want, `all ${flag} writes the same blocks as before, after existing text`);
    assert(!/^---\nname:/m.test(got), `${flag} blocks carry no frontmatter`);
    assert(cli(['all', flag], cwd).status === 0, `all ${flag} again exits 0`);
    assert(fs.readFileSync(path.join(cwd, file), 'utf8') === want, `${flag} re-run is a no-op`);
    assert(!fs.existsSync(path.join(cwd, '.claude')), `${flag} writes no .claude/`);
  }
});

section('bad arguments fail before anything is written', () => {
  const cwd = tmpDir();
  const cases = [
    [['calimero-core', 'nope'], 'an unknown skill'],
    [['calimero-core', '--cursor', '--copilot'], 'two targets'],
    [['calimero-core', '--cursor', '--global'], '--global with a block target'],
    [['calimero-core', '--cusor'], 'an unknown flag'],
    [[], 'no skill'],
  ];
  for (const [args, what] of cases) {
    const r = cli(args, cwd);
    assert(r.status === 1, `${what} exits 1`);
  }
  assert(fs.readdirSync(cwd).length === 0, 'nothing written');
  const list = cli(['--list'], cwd);
  assert(list.status === 0, '--list exits 0');
  for (const s of [...SKILLS, 'app', 'all', '--claude-skills', '--claude-md', '--global']) {
    assert(list.stdout.includes(s), `--list mentions ${s}`);
  }
});

fs.rmSync(tmpRoot, { recursive: true, force: true });
console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
