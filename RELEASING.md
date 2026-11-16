# Releasing

How a change in calimero-skills becomes a release. Agents and people read this before committing,
titling a pull request, or releasing. The first part is the set of rules every calimero-network
repository that ships releases shares; the second is what is specific to this repository.

<!-- shared-release-rules:start -->
## Shared rules

These rules are the same, word for word, in every calimero-network repository
that ships releases. The canonical copy is in
[core's RELEASING.md](https://github.com/calimero-network/core/blob/master/RELEASING.md);
change it there first, then copy the text between the `shared-release-rules`
markers into each repository unchanged. What differs per repository (branches,
tags, where things are published, manual steps) is in the repository section.

### The PR title is the release commit

Pull requests are squash-merged, so the PR title becomes the single commit that
lands on the default branch, and that commit is what release automation reads.
Commits inside the PR do not count. Write the title as a
[Conventional Commit](https://www.conventionalcommits.org/), lower case:
`<type>(<optional scope>): <subject>`.

Where a repository releases from its commits (semantic-release; the repository
section says whether it does), the type picks the version bump:

| PR title | Release |
| --- | --- |
| `feat: ...` | minor |
| `fix:`, `perf:` | patch |
| `docs:`, `chore:`, `refactor:`, `style:`, `test:`, `build:`, `ci:`, `revert:` | none |
| `<type>!: ...`, or a `BREAKING-CHANGE:` footer | major |

- Only the hyphenated `BREAKING-CHANGE:` footer keyword makes a major (besides
  `!`). The commit parser matches note keywords case-insensitively at the start
  of any line of the message, so with the default keyword `BREAKING CHANGE` a
  body line that happened to wrap onto "breaking change ..." published
  mero-react 7.0.0 from a commit that touched only CI and a test fixture. The
  `.releaserc.json` files therefore set `parserOpts.noteKeywords` to
  `["BREAKING-CHANGE"]`, and prose that says "breaking change" does nothing.
- Prefer `!` in the title over the footer: the title is visible in review,
  while the squash commit's body is whatever the merge dialog fills in.
- Only `feat:`, `fix:` and `perf:` release (plus a major from `!` or the
  footer); every other type releases nothing. A change to what users read in
  the package (a README shipped to npm, docstrings) that should reach them is
  titled `fix(docs):` (a patch). To ship a change that touches no feature or
  fix (e.g. a dependency bump consumers need), title it `fix(deps): ...`.
- Choose the type for what the change does to whoever depends on the release,
  not for the size of the diff.

### What counts as breaking

For a library (an SDK, a client, a package other code imports), a change is
breaking when code that built and worked against the previous release can stop
building or behave differently:

- an export, type, method, function or field is removed or renamed;
- a signature changes (a parameter added without a default, a parameter or
  return type changed, a call that becomes async);
- a field of a request, option or config type becomes required;
- accepted values narrow (an enum loses a member, validation refuses input it
  used to accept);
- the error a caller can catch or match on changes type or code.

Additions (a new export, method or optional field) are `feat`.

For an app or a service (a node, an image, a deployed backend), breaking is
what its users or operators must act on: an API route or field removed or
changed, stored data or a wire format that the previous release cannot read
or that cannot be read back, configuration or flags that must change, clients
that must upgrade first. Core declares these through its
[compatibility rules](https://github.com/calimero-network/core/blob/master/docs/src/content/docs/operate/compatibility.mdx)
(deprecations, hard cutovers), not through the title alone.

### Releases happen on merge, through automation

- A repository's workflows release it, triggered by a merge to the release
  branch (or, where the repository section says so, by a tag a human pushes).
  When a workflow's tag or pull request must start another workflow, it acts as
  the organization's GitHub App (`vars.ACTIONS_APP_ID` /
  `secrets.ACTIONS_APP_PRIVATE_KEY`): anything pushed with `GITHUB_TOKEN`
  starts no workflow.
- Never push a tag, create a GitHub Release, publish a package or image, or
  edit a version number by hand, unless the repository section names that
  step as manual and a human asked for it.
- AI agents never do any of these without a human's explicit approval, even
  when the repository section lists the step. An agent's part ends at a pull
  request with the right title.
- A bad release is fixed by the next release (a `fix:` pull request), not by
  moving or deleting a tag: npm, PyPI, Maven Central and crates.io never take
  a published version back.

### OpenAPI sync pull requests from core

The SDKs generate their HTTP clients from core's `docs/public/openapi.json`.
When it changes on core's master, core's
[`sdk-openapi-sync.yml`](https://github.com/calimero-network/core/blob/master/.github/workflows/sdk-openapi-sync.yml)
has each SDK re-vendor it on the machine-owned branch `chore/core-openapi` and
open (or refresh) one pull request. Core's classifier titles that pull request
from what changed in the generated surface: `feat(api)!:` when something a
caller uses was removed or changed, `feat(api):` when something was only
added, `chore(api):` otherwise (descriptions only), which releases nothing:
that change reaches consumers with the SDK's next release.

Don't retitle these down: `feat(api)!:` turned into `feat(api):` ships a
breaking change as a minor to every consumer on a `^` range. Retitle up if the
classifier missed a break. Don't push to `chore/core-openapi`; the workflow
force-pushes it. Fix the document or the generator in core instead.

### A major stops the fleet's automatic bumps

When a package is published, its repository's fleet-bump workflow opens a pull
request in every consumer listed in its `.github/fleet.json`.
`bump-fleet.sh` skips a jump across a major version unless the run sets
`allow_major` (core's fleet bump skips majors the same way), because such a bump
would arrive red on every release. So after a major, consumers stay on the old
major and stop receiving that package's releases until someone moves them on
purpose: plan the consumers' migration pull requests as part of shipping a
major, and expect an accidental major to cut the whole fleet off silently.

### Pre-release lines

Some repositories also publish pre-releases (core's `X.Y.Z-rc.N`).
Which branch makes which kind of release, and
how a pre-release line becomes a final, is in the repository section. Promoting
a line is a human's decision.

### Before you commit, title a pull request, or release

1. The title is a Conventional Commit whose type matches the table above and
   the breaking rules.
2. A breaking change has `!` in the title and says in the PR body what callers
   must change; where the repository keeps a hand-written changelog, the PR
   adds its entry.
3. Version fields, tags and release configuration are left alone unless that is
   the point of the PR and a human asked for it.
4. After the merge, check that the release landed as the repository section
   describes.
<!-- shared-release-rules:end -->

## This repository: calimero-skills

### How a release is triggered

Every push to `master` (a merged pull request) runs [`release.yml`](.github/workflows/release.yml)
("Release and Publish"). It runs the checks (`format:check`, `lint:md`, `npm test`), then
semantic-release with [`.releaserc.json`](.releaserc.json) over the conventional commits since the
last tag, using the table in the shared rules. When they call for a release:

1. semantic-release writes the new version into `package.json` and the notes into `CHANGELOG.md`,
   commits both as `chore(release): X [skip ci]`, tags that commit `vX`, and creates the GitHub
   Release `vX`.
2. The job publishes `@calimero-network/agent-skills@X` to npm with
   `npm publish --provenance --access public`: by npm trusted publishing (OIDC) when npm lists
   `release.yml` as the package's trusted publisher, else with the `NPM_TOKEN` secret.
3. The job pushes the release commit and its tag to `master`.

### Which title releases a skill change

The skills are the package: what a skill teaches is what users install. So a change to a skill's
content that should reach them is not `docs:` (which releases nothing) but:

| Change                                                                                       | PR title                                       |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| A skill teaches something new (a command, an API, a new release's behaviour), or a new skill | `feat(<skill>): ...`                           |
| A skill was wrong or stale, or pins a new core release                                       | `fix(<skill>): ...`                            |
| The installer gains an option or a target                                                    | `feat(install): ...`                           |
| The installer's default or output changes so that existing users must act                    | `feat(install)!: ...`                          |
| README, `docs/` (the GitHub Pages site), CI, tests only                                      | `docs:`, `ci:`, `test:`, `chore:` (no release) |

### Version, tags and changelog

- The version's source of truth is the latest `v*` tag; `package.json`'s `version` on `master`
  follows it through the release commit. Never edit it in a pull request.
- Tags are `v${version}` (`tagFormat` in `.releaserc.json`).
- `CHANGELOG.md` is generated by the release: pull requests do not edit it.
- `master` is the only release branch, and every release is a final.

### Manual steps that need a human

None in a normal release. Once: register `release.yml` as the npm package's trusted publisher
(npmjs.com, the package's settings, "Trusted publisher": GitHub Actions,
`calimero-network/calimero-skills`, workflow `release.yml`), or keep a valid `NPM_TOKEN` secret.

A run that failed after its tag was pushed is fixed by the next release (a `fix:` pull request), not
by re-running it: a re-run fails on the existing tag. `workflow_dispatch` re-runs the same steps,
for a run that failed before the tag.

### Checking that a release landed

- `npm view @calimero-network/agent-skills version` prints `X`.
- The tag `vX`, the GitHub Release and the `chore(release): X` commit are on `master`, and the
  `Release and Publish` run on the merge commit is green.
