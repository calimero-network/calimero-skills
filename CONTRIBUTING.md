# Contributing

## Adding a new skill

1. Create the directory: `skills/<skill-name>/`
2. Add `SKILL.md` — agent instructions, key facts, what to avoid
3. Add `references/` — at least one `.md` file with real code examples
4. Add `rules/` — at least one `.md` file for a hard rule (one rule per file)
5. Run `npm test` to verify structure passes validation
6. Add the skill to the table in `README.md` and `SKILL.md` (root)

## Updating a skill

When a library releases a breaking change:
1. Update affected reference files with the new API
2. Add a rule file if the old API is a common mistake
3. Bump the version in `package.json`

## File guidelines

**SKILL.md** — dense and actionable. Covers: what the developer is trying to do, the
most important facts, a minimal working example, and pointers to references/ and rules/.

**references/\*.md** — real API, real code. No pseudocode. Keep prose minimal. One topic
per file, named after the topic (e.g. `auth.md`, `state-collections.md`).

**rules/\*.md** — one rule per file. Named after the rule. Include: what's wrong, what's
correct, and why. Code examples for both wrong and correct are important.

## Running tests locally

```bash
npm install
npm test
```

The test script checks that every skill has the required directory structure and that
SKILL.md has meaningful content.

## Formatting

```bash
npm run format        # fix formatting
npm run format:check  # check only (used in CI)
npm run lint:md       # lint markdown
```
