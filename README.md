# @calimero-network/agent-skills

AI agent skills for [Calimero Network](https://calimero.network) development.

Install these skills into your project to give AI coding assistants (Claude, Cursor, Copilot)
accurate knowledge of the Calimero SDK, client libraries, registry tooling, and more — without
hallucinating APIs that don't exist.

## Skills

| Skill                                           | When to use                                               |
| ----------------------------------------------- | --------------------------------------------------------- |
| [`calimero-core`](#calimero-core)               | Understanding the runtime model, protocol, and CRDT types |
| [`calimero-rust-sdk`](#calimero-rust-sdk)       | Building Rust apps (core 1.0 component SDK)               |
| [`calimero-sdk-js`](#calimero-sdk-js)           | Building TypeScript WASM applications                     |
| [`calimero-client-js`](#calimero-client-js)     | Frontends on mero-js `CalimeroClient` (Calimero 1.0)      |
| [`calimero-client-py`](#calimero-client-py)     | Python client for node automation and backend services    |
| [`calimero-desktop`](#calimero-desktop)         | Integrating apps with Calimero Desktop SSO                |
| [`calimero-node`](#calimero-node)               | Node operator quick-start (merod + meroctl overview)      |
| [`calimero-merod`](#calimero-merod)             | merod daemon deep-dive — init, config, health             |
| [`calimero-meroctl`](#calimero-meroctl)         | Complete meroctl CLI reference and scripting              |
| [`calimero-registry`](#calimero-registry)       | Packing, signing and publishing apps with `meroctl app`   |
| [`calimero-abi-codegen`](#calimero-abi-codegen) | Typed app clients with `meroctl app codegen`              |

## Install

```bash
# Install a specific skill (writes to CLAUDE.md by default)
npx @calimero-network/agent-skills calimero-rust-sdk

# Target a specific editor
npx @calimero-network/agent-skills calimero-rust-sdk --cursor
npx @calimero-network/agent-skills calimero-rust-sdk --copilot

# List available skills
npx @calimero-network/agent-skills --list
```

### Where skill files are written

| Flag        | File                              |
| ----------- | --------------------------------- |
| (default)   | `CLAUDE.md`                       |
| `--cursor`  | `.cursorrules`                    |
| `--copilot` | `.github/copilot-instructions.md` |

Running the install again updates the existing block without duplicating it.

---

## Skill reference

### calimero-core

The foundational skill for **any Calimero development**. Install this alongside a language-specific
skill to give the AI full-stack context.

Covers:

- Context / Application / Identity mental model
- Full JSON-RPC protocol and endpoint list (`/api/v0/context/{id}/execute`, etc.)
- WebSocket event schema (`ExecutionEvent`, `StateMutation`) with decoding examples
- CRDT storage type taxonomy (`UnorderedMap`, `Vector`, `LwwRegister`, `Counter`, etc.)
- Namespace and group model for multi-node participation
- Authentication flow (login, refresh, JWT lifespan)

Key rules included:

- Application ≠ Context — installing an app does not create a context
- CRDT types only for shared state — no `std::collections`, no plain `Map`/`Array`

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

For developers building **Calimero WASM applications in TypeScript**.

Covers:

- `@State` class with CRDT collection fields
- `@Logic(StateClass)` class with callable methods
- `@Init` static method for seeding initial state
- `@View()` annotation for read-only query methods
- `calimero-cli-js` build tool (`pnpm build`, `pnpm deploy`)
- WASM runtime constraints (no async in state methods, CRDT types only)

Key rules included:

- State fields must be CRDT types — do not use plain `Map`, `Set`, or arrays for persistent state
- `@Logic` class must extend the `@State` class
- `@Init` must be a `static` method returning the state class

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

For developers **integrating their app frontend** with Calimero Desktop SSO.

Covers:

- Hash params passed by Desktop (`access_token`, `refresh_token`, `node_url`, `application_id`)
- Full startup integration pattern (React and vanilla JS)
- How Desktop discovers the app's frontend URL (`manifest.json` `links.frontend`)

Key rules included:

- Always fall back to manual login when hash params are absent

```bash
npx @calimero-network/agent-skills calimero-desktop
```

---

### calimero-node

For **node operators** and developers scripting against a live node.

Covers:

- `merod` startup and configuration
- Full `meroctl` command reference (app, context, identity, call)
- Context lifecycle (app install → context create → invite → join → sync)

Key rules included:

- Application and context are different — installing an app does not create a context

```bash
npx @calimero-network/agent-skills calimero-node
```

---

### calimero-merod

For developers and operators who need deep knowledge of the **`merod` daemon** — init options,
configuration, health checking, and Docker deployment.

Covers:

- `merod init` — all flags, data directory layout
- `merod run` — startup flags and background execution
- Config file schema (`config.toml`) and defaults
- Health endpoint (`GET /health` returns `{ "status": "alive" }`)
- Docker and Docker Compose health check patterns
- Multiple nodes on one machine (port management)

Key rules included:

- Always run `merod init` before `merod run` on a new home directory
- Never re-init a production node — it destroys the keypair and breaks existing contexts
- Ports are set at init time; server-port and swarm-port have different consumers

```bash
npx @calimero-network/agent-skills calimero-merod
```

---

### calimero-meroctl

Complete **`meroctl` CLI reference** for developers and operators scripting against a running node.

Covers:

- All subcommand groups: `node`, `app`, `context`, `call`, `identity`, `namespace`, `group`
- Every flag for each command
- Scripting patterns for CI/CD pipelines
- Multi-node setup with namespace invite + group join-context
- Dev-mode hot reload (`context create --watch`)

Key rules included:

- Register a node once with `meroctl node add` + `meroctl node use`; omit `--node` after
- Always pass `--view` for read-only method calls

```bash
npx @calimero-network/agent-skills calimero-meroctl
```

---

### calimero-client-py

For developers using the **Python client** to automate or script against a Calimero node.

Covers:

- Full async API (contexts, apps, identities, blobs, aliases, proposals)
- Authentication and token caching (`~/.merobox/auth_cache/`)
- First-time token seeding and CI/CD patterns

Key rules included:

- `node_name` must be stable and unique per node — changing it loses cached tokens
- All client methods are async and must be awaited

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
├── SKILL.md          # Agent instructions: what to know, what to avoid
├── references/       # Detailed API guides with real code examples
└── rules/            # Hard rules: one file per rule, named after the rule
```

The install script appends skill content to your editor's context file, wrapped in markers so
re-running updates the block cleanly.

## Validation

CI (and `npm test`) runs these checks; run them locally before opening a PR:

| Command                            | What it enforces                                                                                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check`             | Prettier formatting (`.md`/`.json`/`.js`/`.ts`)                                                                                                                                                |
| `npm run lint:md`                  | Markdown structure (markdownlint)                                                                                                                                                              |
| `npm test` → `test.js`             | Every skill has `SKILL.md` + non-empty `references/` and `rules/`                                                                                                                              |
| `npm test` → `validate-content.js` | **Content rules** in fenced code blocks — no `meroctl call --as`/`--view`, `context create` carries `--group-id`, no `SharedStorage`, no deprecated `@calimero-network/calimero-client` import |
| `npm test` → `check-versions.js`   | Core version pins agree (`1.0.0-rc.N` consistent across skills)                                                                                                                                |

The content linter scans only fenced code blocks (never prose) and strips comments. A deliberate
counter-example (a "Don't do this" block) opts out with an HTML comment on the line before the
fence:

```text
<!-- validate-ignore: no-view-flag (intentional WRONG example) -->
```

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
