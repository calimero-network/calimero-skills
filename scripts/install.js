#!/usr/bin/env node
'use strict';

/**
 * Installs Calimero agent skills into a project (or, for Claude Code, into the
 * user's own skills directory).
 *
 *   calimero-skills <skill|set>... [--claude-skills|--claude-md|--cursor|--copilot] [--global]
 *
 * Targets:
 *   --claude-skills (default)  .claude/skills/<skill>/ : a Claude Code skill (SKILL.md with
 *                              frontmatter, references/, rules/), loaded only when its
 *                              description matches the task. --global writes ~/.claude/skills/.
 *   --claude-md                one marked block per skill in CLAUDE.md (the pre-0.8 default)
 *   --cursor                   one marked block per skill in .cursorrules
 *   --copilot                  one marked block per skill in .github/copilot-instructions.md
 *
 * Each skill's name and description live once, in the YAML frontmatter of
 * skills/<skill>/SKILL.md. The block targets strip that frontmatter, so their
 * blocks are the skill's text alone.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');
const PACKAGE = require(path.join(ROOT, 'package.json'));

const VALID_SKILLS = fs
  .readdirSync(SKILLS_DIR)
  .filter((f) => fs.statSync(path.join(SKILLS_DIR, f)).isDirectory())
  .sort();

// Named sets of skills. `app` is the starter set for building an app on Calimero 1.0:
// the model, the Rust backend, the frontend client, the CLI, typed clients and publishing.
const SETS = {
  app: [
    'calimero-core',
    'calimero-rust-sdk',
    'calimero-client-js',
    'calimero-meroctl',
    'calimero-abi-codegen',
    'calimero-registry',
  ],
  all: VALID_SKILLS,
};

const BLOCK_TARGETS = {
  'claude-md': 'CLAUDE.md',
  cursor: '.cursorrules',
  copilot: '.github/copilot-instructions.md',
};
const TARGET_FLAGS = ['claude-skills', ...Object.keys(BLOCK_TARGETS)];
const DEFAULT_TARGET = 'claude-skills';
const SUBDIRS = ['references', 'rules'];

class UsageError extends Error {}

// --- Frontmatter --------------------------------------------------------------

/**
 * Splits a SKILL.md into its YAML frontmatter fields and its body.
 *
 * Supports the subset the skills use: `key: value` pairs whose value is a plain,
 * single-quoted or double-quoted scalar, possibly folded over indented
 * continuation lines (the shape prettier writes). Anything else throws, and
 * `npm test` cross-checks the result against a full YAML parser.
 */
function parseSkillMd(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { fields: {}, body: text };
  const fields = {};
  let key = null;
  let parts = [];
  const flush = () => {
    if (key !== null) fields[key] = unquote(parts.filter(Boolean).join(' '), key);
  };
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):(?:\s+(.*))?$/.exec(line);
    if (kv) {
      flush();
      key = kv[1];
      parts = [(kv[2] || '').trim()];
    } else if (/^\s+\S/.test(line) && key !== null) {
      parts.push(line.trim());
    } else if (line.trim() !== '') {
      throw new Error(`unsupported frontmatter line: ${line}`);
    }
  }
  flush();
  return { fields, body: text.slice(m[0].length) };
}

function unquote(value, key) {
  if (value.startsWith("'")) {
    if (!value.endsWith("'") || value.length < 2) throw new Error(`unterminated '${key}'`);
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (value.startsWith('"')) return JSON.parse(value);
  if (/^[|>&*!%@`{[]/.test(value) || /:\s|\s#/.test(value)) {
    throw new Error(`unsupported YAML value for '${key}': quote it`);
  }
  return value;
}

function readSkill(skillName) {
  const skillDir = path.join(SKILLS_DIR, skillName);
  const { fields, body } = parseSkillMd(fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8'));
  return { name: fields.name, description: fields.description, body: body.trim(), skillDir };
}

function listMd(dir) {
  return fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.md'))
        .sort()
    : [];
}

// --- Block targets (CLAUDE.md, .cursorrules, copilot-instructions.md) ---------

function readSkillContent(skillName) {
  const { body, skillDir } = readSkill(skillName);
  const parts = [body];
  for (const sub of SUBDIRS) {
    for (const f of listMd(path.join(skillDir, sub))) {
      parts.push(fs.readFileSync(path.join(skillDir, sub, f), 'utf8').trim());
    }
  }
  return parts.join('\n\n---\n\n');
}

function appendToFile(filePath, header, content) {
  const marker = `<!-- calimero-skills:${header} -->`;
  const block = `\n\n${marker}\n\n${content}\n\n${marker}:end`;

  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf8');
    // Replace existing block if present
    const re = new RegExp(`${marker}[\\s\\S]*?${marker}:end`, 'g');
    if (re.test(existing)) {
      fs.writeFileSync(
        filePath,
        existing.replace(re, () => block.trim())
      );
      return 'updated';
    }
    fs.appendFileSync(filePath, block);
    return 'appended';
  } else {
    fs.writeFileSync(filePath, block.trim());
    return 'created';
  }
}

function installBlock(skillName, target, cwd) {
  const targetFile = path.join(cwd, BLOCK_TARGETS[target]);
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  const result = appendToFile(targetFile, skillName, readSkillContent(skillName));
  return `${result} in ${BLOCK_TARGETS[target]}`;
}

// --- Claude Code skills (.claude/skills/<skill>/) -----------------------------

function firstHeading(file) {
  const m = /^#{1,6}\s+(.+?)\s*#*\s*$/m.exec(fs.readFileSync(file, 'utf8'));
  return m ? m[1] : path.basename(file, '.md');
}

/** The SKILL.md Claude Code reads: frontmatter, a generated-by note, the body, a file index. */
function renderClaudeSkillMd(skillName) {
  const { name, description, body, skillDir } = readSkill(skillName);
  if (name !== skillName) {
    throw new Error(`skills/${skillName}/SKILL.md: frontmatter name is "${name}"`);
  }
  if (!description) throw new Error(`skills/${skillName}/SKILL.md: no frontmatter description`);

  const files = SUBDIRS.flatMap((sub) =>
    listMd(path.join(skillDir, sub)).map((f) => `${sub}/${f}`)
  );
  // A SKILL.md that names every reference and rule file by path already tells Claude
  // where they are. Otherwise list them all, so Claude knows what it can read.
  const unnamed = files.filter((f) => !body.includes(f));
  const index = unnamed.length
    ? [
        '',
        '## Files in this skill',
        '',
        'Read these when the task needs them (paths are relative to this file):',
        '',
        ...files.map((f) => `- [\`${f}\`](${f}): ${firstHeading(path.join(skillDir, f))}`),
      ].join('\n')
    : '';

  return [
    '---',
    `name: ${name}`,
    `description: ${JSON.stringify(description)}`,
    '---',
    '',
    `<!-- Generated by ${PACKAGE.name} ${PACKAGE.version} from skills/${skillName}. ` +
      'Re-run the installer to update it; edits here are overwritten. -->',
    '',
    body,
    index,
    '',
  ].join('\n');
}

function claudeSkillsDir(global, cwd) {
  return global
    ? path.join(os.homedir(), '.claude', 'skills')
    : path.join(cwd, '.claude', 'skills');
}

function installClaudeSkill(skillName, baseDir) {
  const { skillDir } = readSkill(skillName);
  const dest = path.join(baseDir, skillName);
  const tmp = path.join(baseDir, `.${skillName}.tmp-${process.pid}`);
  fs.mkdirSync(baseDir, { recursive: true });
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp);
  try {
    fs.writeFileSync(path.join(tmp, 'SKILL.md'), renderClaudeSkillMd(skillName));
    for (const sub of SUBDIRS) {
      const src = path.join(skillDir, sub);
      if (fs.existsSync(src)) fs.cpSync(src, path.join(tmp, sub), { recursive: true });
    }
    const existed = fs.existsSync(dest);
    // Replace the whole directory, so a file dropped from the skill does not linger.
    fs.rmSync(dest, { recursive: true, force: true });
    fs.renameSync(tmp, dest);
    return existed ? 'replaced' : 'created';
  } catch (err) {
    fs.rmSync(tmp, { recursive: true, force: true });
    throw err;
  }
}

// --- CLI ---------------------------------------------------------------------

function parseArgs(argv) {
  const names = [];
  const targets = [];
  let global = false;
  let list = false;
  let help = false;
  for (const a of argv) {
    if (a === '--global' || a === '-g') global = true;
    else if (a === '--list') list = true;
    else if (a === '--help' || a === '-h') help = true;
    else if (a.startsWith('-')) {
      const t = a.replace(/^--/, '');
      if (!TARGET_FLAGS.includes(t)) throw new UsageError(`Unknown option: ${a}`);
      if (!targets.includes(t)) targets.push(t);
    } else names.push(a);
  }
  if (targets.length > 1) {
    throw new UsageError(`Choose one target, not ${targets.map((t) => `--${t}`).join(' and ')}`);
  }
  const target = targets[0] || DEFAULT_TARGET;
  if (global && target !== 'claude-skills') {
    throw new UsageError('--global applies to --claude-skills only');
  }
  return { names, target, global, list, help };
}

/** Expands set names (`app`, `all`), keeps the first occurrence of each skill, rejects unknowns. */
function resolveSkills(names) {
  const out = [];
  const unknown = [];
  for (const n of names) {
    const expanded = SETS[n] || (VALID_SKILLS.includes(n) ? [n] : null);
    if (!expanded) unknown.push(n);
    else for (const s of expanded) if (!out.includes(s)) out.push(s);
  }
  if (unknown.length) {
    throw new UsageError(
      `Unknown skill${unknown.length > 1 ? 's' : ''}: ${unknown.map((u) => `"${u}"`).join(', ')}\n` +
        `Valid skills: ${VALID_SKILLS.join(', ')}\nSets: ${Object.keys(SETS).join(', ')}`
    );
  }
  return out;
}

function usage() {
  const npx = 'npx @calimero-network/agent-skills';
  return [
    'Usage:',
    `  ${npx} <skill|set>... [target] [--global]`,
    '',
    'Examples:',
    `  ${npx} app                        # starter set for building an app, as Claude Code skills`,
    `  ${npx} calimero-rust-sdk          # one skill`,
    `  ${npx} app --global               # into ~/.claude/skills, for every project`,
    `  ${npx} all --cursor               # every skill`,
    `  ${npx} --list`,
    '',
    'Targets (one):',
    '  --claude-skills  .claude/skills/<skill>/ (default; with --global, ~/.claude/skills/)',
    '  --claude-md      a block per skill in CLAUDE.md',
    '  --cursor         a block per skill in .cursorrules',
    '  --copilot        a block per skill in .github/copilot-instructions.md',
    '',
    'Re-running replaces what an earlier install of the same skill wrote.',
  ].join('\n');
}

function listing() {
  const width = Math.max(...VALID_SKILLS.map((s) => s.length));
  const lines = ['Available Calimero agent skills:', ''];
  for (const s of VALID_SKILLS) {
    const { description } = readSkill(s);
    lines.push(`  ${s.padEnd(width)}  ${description.split('. Use ')[0]}`);
  }
  lines.push('', 'Sets:', '');
  for (const [name, skills] of Object.entries(SETS)) {
    lines.push(`  ${name.padEnd(width)}  ${name === 'all' ? 'every skill' : skills.join(' ')}`);
  }
  return lines.join('\n');
}

function run(argv, { cwd = process.cwd(), log = console.log } = {}) {
  const { names, target, global, list, help } = parseArgs(argv);
  if (help || list) {
    log(`\n${list ? `${listing()}\n\n` : ''}${usage()}\n`);
    return 0;
  }
  if (!names.length) throw new UsageError(`${listing()}\n\n${usage()}`);
  const skills = resolveSkills(names);

  log('');
  if (target === 'claude-skills') {
    const baseDir = claudeSkillsDir(global, cwd);
    const shown = global ? path.join('~', '.claude', 'skills') : path.join('.claude', 'skills');
    for (const s of skills) {
      const result = installClaudeSkill(s, baseDir);
      log(`✓ Skill "${s}" ${result} in ${path.join(shown, s)}/`);
    }
    const claudeMd = path.join(cwd, 'CLAUDE.md');
    if (fs.existsSync(claudeMd)) {
      const text = fs.readFileSync(claudeMd, 'utf8');
      const stale = skills.filter((s) => text.includes(`<!-- calimero-skills:${s} -->`));
      if (stale.length) {
        log(
          `\nNote: CLAUDE.md still holds an earlier install of ${stale.join(', ')}, which Claude ` +
            'reads on every turn.\nDelete each block between its <!-- calimero-skills:<skill> --> ' +
            'markers, now that the skill loads on demand.'
        );
      }
    }
  } else {
    for (const s of skills) log(`✓ Skill "${s}" ${installBlock(s, target, cwd)}`);
  }
  log(`  Target: ${target}\n`);
  return 0;
}

module.exports = {
  SETS,
  VALID_SKILLS,
  parseSkillMd,
  readSkillContent,
  renderClaudeSkillMd,
  resolveSkills,
  run,
};

if (require.main === module) {
  try {
    process.exitCode = run(process.argv.slice(2));
  } catch (err) {
    console.error(`\n${err instanceof UsageError ? err.message : err.stack || err}\n`);
    process.exitCode = 1;
  }
}
