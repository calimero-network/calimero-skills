#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

const skills = fs
  .readdirSync(SKILLS_DIR)
  .filter((f) => fs.statSync(path.join(SKILLS_DIR, f)).isDirectory());

console.log(`\nChecking ${skills.length} skills...\n`);

for (const skill of skills) {
  console.log(`[${skill}]`);
  const skillDir = path.join(SKILLS_DIR, skill);

  assert(fs.existsSync(path.join(skillDir, 'SKILL.md')), 'SKILL.md exists');
  assert(fs.existsSync(path.join(skillDir, 'references')), 'references/ directory exists');
  assert(fs.existsSync(path.join(skillDir, 'rules')), 'rules/ directory exists');

  const skillMd = path.join(skillDir, 'SKILL.md');
  if (fs.existsSync(skillMd)) {
    const content = fs.readFileSync(skillMd, 'utf8');
    assert(content.length > 100, 'SKILL.md has meaningful content');
    assert(content.includes('##'), 'SKILL.md has sections');
  }

  const refsDir = path.join(skillDir, 'references');
  if (fs.existsSync(refsDir)) {
    const refs = fs.readdirSync(refsDir).filter((f) => f.endsWith('.md'));
    assert(refs.length > 0, `references/ has at least one file (found ${refs.length})`);
  }

  const rulesDir = path.join(skillDir, 'rules');
  if (fs.existsSync(rulesDir)) {
    const rules = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.md'));
    assert(rules.length > 0, `rules/ has at least one file (found ${rules.length})`);
  }

  console.log('');
}

console.log(`Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
