#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const VALID_SKILLS = fs.readdirSync(SKILLS_DIR).filter((f) =>
  fs.statSync(path.join(SKILLS_DIR, f)).isDirectory()
);

const TARGETS = {
  claude: 'CLAUDE.md',
  cursor: '.cursorrules',
  copilot: '.github/copilot-instructions.md',
};

function parseArgs() {
  const args = process.argv.slice(2);
  const skill = args.find((a) => !a.startsWith('--'));
  const target = args.includes('--cursor')
    ? 'cursor'
    : args.includes('--copilot')
      ? 'copilot'
      : 'claude';
  const listOnly = args.includes('--list');
  return { skill, target, listOnly };
}

function readSkillContent(skillName) {
  const skillDir = path.join(SKILLS_DIR, skillName);
  const parts = [];

  // SKILL.md first
  const skillMd = path.join(skillDir, 'SKILL.md');
  if (fs.existsSync(skillMd)) {
    parts.push(fs.readFileSync(skillMd, 'utf8').trim());
  }

  // references/
  const refsDir = path.join(skillDir, 'references');
  if (fs.existsSync(refsDir)) {
    const refs = fs.readdirSync(refsDir).filter((f) => f.endsWith('.md'));
    for (const ref of refs.sort()) {
      parts.push(fs.readFileSync(path.join(refsDir, ref), 'utf8').trim());
    }
  }

  // rules/
  const rulesDir = path.join(skillDir, 'rules');
  if (fs.existsSync(rulesDir)) {
    const rules = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.md'));
    for (const rule of rules.sort()) {
      parts.push(fs.readFileSync(path.join(rulesDir, rule), 'utf8').trim());
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
      fs.writeFileSync(filePath, existing.replace(re, block.trim()));
      return 'updated';
    }
    fs.appendFileSync(filePath, block);
    return 'appended';
  } else {
    fs.writeFileSync(filePath, block.trim());
    return 'created';
  }
}

function main() {
  const { skill, target, listOnly } = parseArgs();

  if (listOnly || !skill) {
    console.log('\nAvailable Calimero agent skills:\n');
    for (const s of VALID_SKILLS) {
      console.log(`  ${s}`);
    }
    console.log('\nUsage:');
    console.log('  npx @calimero-network/agent-skills <skill-name>');
    console.log('  npx @calimero-network/agent-skills <skill-name> --cursor');
    console.log('  npx @calimero-network/agent-skills <skill-name> --copilot');
    console.log('  npx @calimero-network/agent-skills --list\n');
    if (!listOnly) process.exit(1);
    return;
  }

  if (!VALID_SKILLS.includes(skill)) {
    console.error(`\nUnknown skill: "${skill}"`);
    console.error(`Valid skills: ${VALID_SKILLS.join(', ')}\n`);
    process.exit(1);
  }

  const content = readSkillContent(skill);
  const targetFile = TARGETS[target];

  // Ensure parent dir exists (e.g. .github/ for copilot)
  const dir = path.dirname(path.resolve(targetFile));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const result = appendToFile(targetFile, skill, content);
  console.log(`\n✓ Skill "${skill}" ${result} in ${targetFile}`);
  console.log(`  Target: ${target}\n`);
}

main();
