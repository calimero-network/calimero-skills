# @calimero-network/agent-skills

AI agent skills for [Calimero Network](https://calimero.network) development.

Install these skills into your project to give AI coding assistants (Claude, Cursor, Copilot)
accurate knowledge of the Calimero SDK, client libraries, registry tooling, and more — without
hallucinating APIs that don't exist.

## Skills

| Skill                                           | When to use                                             |
| ----------------------------------------------- | ------------------------------------------------------- |
| [`calimero-core`](#calimero-core)               | How core 1.0 works: Raft logs, orgs, accounts, trust    |
| [`calimero-rust-sdk`](#calimero-rust-sdk)       | Building Rust apps (core 1.0 component SDK)             |
| [`calimero-sdk-js`](#calimero-sdk-js)           | The gone 0.x JS app SDK, and what replaces it           |
| [`calimero-client-js`](#calimero-client-js)     | Frontends on mero-js `CalimeroClient` (Calimero 1.0)    |
| [`calimero-client-py`](#calimero-client-py)     | Python client: scripts, services, operator automation   |
| [`calimero-desktop`](#calimero-desktop)         | Desktop hash-token SSO: 0.x only, and what 1.0 uses     |
| [`calimero-node`](#calimero-node)               | Operating a cluster with `meroctl ops`                  |
| [`calimero-merod`](#calimero-merod)             | The `merod` binary: init, config, run, local, attest    |
| [`calimero-meroctl`](#calimero-meroctl)         | core 1.0's meroctl: cluster, sign-in, instances, calls  |
| [`calimero-registry`](#calimero-registry)       | Packing, signing and publishing apps with `meroctl app` |
| [`calimero-abi-codegen`](#calimero-abi-codegen) | Typed app clients with `meroctl app codegen`            |

## Install

```bash
# The starter set for building an app (core, rust-sdk, client-js, meroctl, abi-codegen, registry),
# as Claude Code skills in .claude/skills/
npx @calimero-network/agent-skills app

# One skill, several, or every skill
npx @calimero-network/agent-skills calimero-rust-sdk
npx @calimero-network/agent-skills calimero-core calimero-meroctl
npx @calimero-network/agent-skills all

# For every project: Claude Code skills in ~/.claude/skills/
npx @calimero-network/agent-skills app --global

# Another editor, or one CLAUDE.md block per skill
npx @calimero-network/agent-skills app --cursor
npx @calimero-network/agent-skills app --copilot
npx @calimero-network/agent-skills app --claude-md

# List the skills and sets
npx @calimero-network/agent-skills --list
```

### Where skill files are written

| Flag                        | Written to                                       |
| --------------------------- | ------------------------------------------------ |
| `--claude-skills` (default) | `.claude/skills/<skill>/` (a Claude Code skill)  |
| `--claude-skills --global`  | `~/.claude/skills/<skill>/`                      |
| `--claude-md`               | `CLAUDE.md`, one marked block per skill          |
| `--cursor`                  | `.cursorrules`, one marked block per skill       |
| `--copilot`                 | `.github/copilot-instructions.md`, one per skill |

A Claude Code skill is a directory with a `SKILL.md` (frontmatter `name` and `description`, then the
skill's instructions), its `references/` and its `rules/`. Claude Code reads only the descriptions
up front and loads a skill when the task matches it, so installing every skill costs little context.
The block targets put the whole text of each skill into a file the editor reads on every turn.

Running the install again replaces what an earlier install of the same skill wrote: the skill's
directory, or its block. Before 0.8.0 the default target was `CLAUDE.md`; if your `CLAUDE.md` still
holds a `calimero-skills` block for a skill you now install as a Claude Code skill, the installer
says so, and you can delete the block between its markers.

### Sets

| Name  | Skills                                                                                                                      |
| ----- | --------------------------------------------------------------------------------------------------------------------------- |
| `app` | `calimero-core`, `calimero-rust-sdk`, `calimero-client-js`, `calimero-meroctl`, `calimero-abi-codegen`, `calimero-registry` |
| `all` | Every skill                                                                                                                 |

---

## Skill reference

### calimero-core

The foundational skill for **any Calimero development**: how core 1.0 works. Install it alongside a
hands-on skill to give the AI the model behind the commands.

Covers:

- App instances (v1's contexts), each replicated by its own Raft log: the leader runs a call, the
  followers apply its diff; the system group holds who exists and who may do what
- Organizations, teams, roles, capabilities, access rules and invites
- Accounts, passkeys, sessions, API keys, step-ups and the operator
- Attestation, the sealed channel, receipts, packages and their signers, served frontends

Key rules included:

- The leader runs, followers apply: no gossip, no CRDT merging, no sync commands
- A package is code; an instance is one running copy of it

```bash
npx @calimero-network/agent-skills calimero-core
```

---

### calimero-rust-sdk

For developers building **Calimero apps in Rust** with core 1.0's component SDK (`calimero-sdk`).

Covers:

- The app skeleton: `#[app::state(version = N)]`, `#[app::logic]`, `#[app::init]`, `#[app::view]`,
  `#[app::error]`, `#[app::event]`, `#[app::confirm]` and the other method attributes
- Tables (`#[derive(Record)]`, indexes, counts, pages) and collections (`UnorderedMap`, `Set`,
  `Vector`, `Cell`, `Counter`, `PerUser`, `Frozen`, `Text`)
- `env` and `guards`: the caller, organization roles, time, ids, events with audiences, cross-app
  calls
- Blobs (`BlobRef`, `calimero_sdk::files`), testing with `TestApp` and scenarios, upgrades
- Building with `meroctl app build` (`wasm32-wasip2` component), `meroctl local` for development

Key rules included:

- Attribute placement; `#[app::error]` / `#[app::event]` in the logic module, named fields only
- `Record` or `AbiType` on every type a method exchanges
- Deterministic runs: `env::time_now()`, `env::random_bytes()`, `env::unique_id()`; SDK 0.12 APIs
  (`calimero-storage`, `app::emit!`, `#[app::private]`) and the old tools (`cargo mero`,
  `mero-app-build`, merobox) do not exist

```bash
npx @calimero-network/agent-skills calimero-rust-sdk
```

---

### calimero-sdk-js

For projects that still use the **0.x JavaScript app SDK** (`@calimero-network/calimero-sdk-js`,
`@State`/`@Logic`, `calimero-sdk build`). Core 1.0 ships no JavaScript SDK and refuses the core
modules it builds.

Covers:

- What is true now: apps are Rust components (`calimero-rust-sdk`); TypeScript is for clients
  (`calimero-client-js`)
- What the engine's componentize-js compatibility does and does not mean
- A 0.x-to-1.0 mapping of every SDK concept, with the KV store in Rust

Key rules included:

- Do not write app logic with the 0.x JS SDK

```bash
npx @calimero-network/agent-skills calimero-sdk-js
```

---

### calimero-client-js

For developers building **frontends or Node.js services** on Calimero 1.0 with mero-js's
`CalimeroClient`.

Covers:

- Connecting (`CalimeroClient.connect({ cluster, policy })`, fixed nodes, `merod local`) and what
  the client attests
- Passkey sign-up and sign-in, sessions, API keys
- `client.apps.call` / `client.apps.view`, typed errors, passkey step-ups, the generated typed
  client
- Organizations, invites, roles and teams; creating and upgrading app instances
- Following events (`client.events`) and blobs

Key rules included:

- Use `CalimeroClient`, never the v1 `MeroJs` / JSON-RPC / contexts client
- camelCase methods and arguments; one object per generated route method
- Let mero-js refresh the session and store the refreshed one

```bash
npx @calimero-network/agent-skills calimero-client-js
```

---

### calimero-registry

For developers **publishing apps** to the Calimero App Registry.

Covers:

- `meroctl app pack` - build, sign, and pack the `.mpk` (metadata from
  `[package.metadata.calimero]`)
- Key generation and security (`meroctl app signer new|id`)
- `manifest.json` format and required fields, `meroctl app inspect`
- Signing workflow (RFC 8785 canonicalization + Ed25519), `meroctl app sign`
- `meroctl app publish`, with a registry API key or a Cloud organization's `ck_live_` key (`--org`)
- CI auto-publish with a pinned `meroctl` release

Key rules included:

- Every bundle is signed, and every artifact hash must match its bytes
- Never commit `key.json` to version control

```bash
npx @calimero-network/agent-skills calimero-registry
```

---

### calimero-desktop

For projects that carry **Calimero Desktop's hash-token SSO** (`access_token` in
`window.location.hash`, `parseAuthCallback`). The desktop app still runs the 0.x node (merod 0.12,
mero-js 26), and core 1.0 has no desktop SSO.

Covers:

- What the desktop is and sends today, checked in its source
- What a core 1.0 frontend does instead: passkey sign-in through mero-js, frontends served from the
  package, API keys for machines

Key rules included:

- A core 1.0 frontend never reads a session from the URL

```bash
npx @calimero-network/agent-skills calimero-desktop
```

---

### calimero-node

For **operators** of a core 1.0 cluster.

Covers:

- The ops token and the operator key, and which decisions the operator signs
- Every `meroctl ops` command: status, placement, nodes, moves, backups, restores, recovery, quotas,
  release approvals, app upgrades (`ops upgrade-org`)
- Runbooks: add, remove and move nodes, back up and restore, found a cluster again, upgrade the
  cluster's release and its apps

Key rules included:

- Sign operator decisions with the operator key, kept off the nodes
- Roll a new release by adding nodes, never by swapping the image under a node

```bash
npx @calimero-network/agent-skills calimero-node
```

---

### calimero-merod

For developers and operators running **`merod`**, the core 1.0 node.

Covers:

- `merod init`, `config` and `run`, and every node flag with its `MEROD_*` variable and default
- `merod local`, `inspect`, `kms disk-key`, `attest`, job nodes and containers
- `/health`, `/attestation`, `/ops/status` and the metrics worth alerting on

Key rules included:

- `--dev` and development keys only on development nodes
- Governance flags and the operator key are fixed at genesis

```bash
npx @calimero-network/agent-skills calimero-merod
```

---

### calimero-meroctl

**`meroctl`**, core 1.0's one command line, for developers and operators working against a cluster.

Covers:

- Installing it (`scripts/install.sh`, Homebrew)
- The development cluster: `meroctl local up|down|status|dev|test` (one node by default, in the
  release's Docker image)
- Signing in: `login --dev-passkey` on development clusters, API keys and the trust flags
  (`--allow-mock`, `--tee-profiles`, `--min-release`) on real ones; `attest`
- Saved nodes (`node add|use`, `--api`), apps (`app install`), app instances
  (`instance create --name ... --path|--package|--bundle [--params] [--org [--team]]`) and
  `call -i INSTANCE METHOD [--view]`
- Organizations (`org`) and teams (`team`), blobs and sealed files, Calimero Cloud (`cloud`),
  `proxy`, `raw` and `ops`
- Scripting and CI with `jq` and upgrade keys, and what changed from the 0.x CLI

Key rules included:

- Read with `call --view`; name the instance with `-i`
- `instance create` takes `--org`/`--team` (or neither), never `--group-id`
- File passkeys and `--allow-mock` are for development clusters only
- Save a node once with `meroctl node add` + `meroctl node use`; omit `--node` after

```bash
npx @calimero-network/agent-skills calimero-meroctl
```

---

### calimero-client-py

For developers using the **Python client** (`calimero-client-py`) against core 1.0.

Covers:

- `Client` and `Client.connect` with a trust policy; API keys and passkeys
- Calls, views, confirm methods, events and presence
- Instances, packages, organizations, API keys and the operator's Ops API

Key rules included:

- The 0.x client (`create_connection`, contexts, cached tokens) is gone
- Name the images you trust; `allow_mock` only on development clusters

```bash
npx @calimero-network/agent-skills calimero-client-py
```

---

### calimero-abi-codegen

For generating a **typed client** for a Calimero app from its ABI with core's `meroctl app codegen`
(TypeScript, Python, Swift, Kotlin or OpenAPI). The deprecated npm `@calimero-network/abi-codegen`
read SDK 0.12 ABIs only; the skill keeps its name.

Covers:

- Running `codegen` on a component, `.mpk` or ABI JSON, and how the client class is named
- Everything the TypeScript `client.ts` exports: `<Name>Client`, `<Name>Api`, `raw`, `events`,
  `InitArgs`, error and event types, the `{ after }` option
- The component ABI format, installing `meroctl`, and `meroctl app abi diff` for breaking changes

Key rules included:

- Regenerate the client; never edit it
- Derive `Record` or `AbiType` on every exchanged type, or the client types it `unknown`

```bash
npx @calimero-network/agent-skills calimero-abi-codegen
```

---

## Structure

Each skill follows this layout:

```text
skills/<skill-name>/
├── SKILL.md          # Frontmatter (name, description), then what to know and what to avoid
├── references/       # Detailed API guides with real code examples
└── rules/            # Hard rules: one file per rule, named after the rule
```

The `description` in a skill's frontmatter is its only copy: the Claude Code target writes it into
the generated `SKILL.md`, `--list` prints it, and the block targets strip the frontmatter. The
Claude Code target copies `references/` and `rules/` beside the generated `SKILL.md`, and appends an
index of them when the `SKILL.md` does not name each file.

## Validation

CI (and `npm test`) runs these checks; run them locally before opening a PR:

| Command                            | What it enforces                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check`             | Prettier formatting (`.md`/`.json`/`.js`/`.ts`)                                                                                                                                                                                                                                                                                                                           |
| `npm run lint:md`                  | Markdown structure (markdownlint)                                                                                                                                                                                                                                                                                                                                         |
| `npm test` → `test.js`             | Every skill has `SKILL.md` + non-empty `references/` and `rules/`                                                                                                                                                                                                                                                                                                         |
| `npm test` → `test-install.js`     | The installer: frontmatter is valid YAML with `name` and `description`, every skill installs to `.claude/skills` with its files and resolving links, `app`/`all`, idempotent re-runs, and unchanged CLAUDE.md/Cursor/Copilot blocks                                                                                                                                       |
| `npm test` → `validate-content.js` | **Content rules** in fenced code blocks: core 1.0's meroctl (`call -i`, `instance create --name`, `org`/`team`, no `call --as`, no 0.x `--group-id`/`--application-id`/`context identity`/`peers`/`sync`, no JSON-RPC envelope, no merobox), no 0.x JS app SDK, no hash-token SSO and no deprecated `@calimero-network/calimero-client` import; rule self-tests run first |
| `npm test` → `check-versions.js`   | Core version pins agree (`1.0.0-rc.N` consistent across skills)                                                                                                                                                                                                                                                                                                           |

The content linter scans only fenced code blocks (never prose) and strips comments. A deliberate
counter-example (a "Don't do this" block) opts out with an HTML comment on the line before the
fence:

```text
<!-- validate-ignore: no-group-id (intentional WRONG example) -->
```

Every skill teaches core 1.0 and must pass. A skill listed in `STALE_SKILLS` in the linter (none
today) reports its violations as warnings while a rewrite is pending.

A separate workflow (`version-watch.yml`, also `npm run check:versions:latest`) compares the pinned
core version to the latest `calimero-network/core` release tag and goes red when core cuts a newer
rc — the cue to update the core pins in the skill files and re-audit against the new release. The
"expected" version is **derived from the skill pins themselves** (nothing is hardcoded): the
consistency check requires all pins to agree, and the freshness check compares that pinned version
to the live latest tag.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add or update a skill.

Skills should be:

- Based on real API surfaces, not pseudocode
- Focused on code examples over prose
- Kept up to date with library releases

## Links

- [Calimero Network](https://calimero.network)
- [Documentation](https://docs.calimero.network)
- [Repository](https://github.com/calimero-network/calimero-skills)
- [GitHub org](https://github.com/calimero-network)
- [Discord](https://discord.gg/urJeMtRRMu)
