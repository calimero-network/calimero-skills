# @calimero-network/agent-skills

AI agent skills for [Calimero Network](https://calimero.network) development.

Install these skills into your project to give AI coding assistants (Claude, Cursor, Copilot)
accurate knowledge of the Calimero SDK, client libraries, registry tooling, and more — without
hallucinating APIs that don't exist.

## Skills

| Skill                                           | When to use                                               |
| ----------------------------------------------- | --------------------------------------------------------- |
| [`calimero-core`](#calimero-core)               | Understanding the runtime model, protocol, and CRDT types |
| [`calimero-rust-sdk`](#calimero-rust-sdk)       | Building Rust WASM applications                           |
| [`calimero-sdk-js`](#calimero-sdk-js)           | Building TypeScript WASM applications                     |
| [`calimero-client-js`](#calimero-client-js)     | Frontend / Node.js clients connecting to a node           |
| [`calimero-client-py`](#calimero-client-py)     | Python client for node automation and backend services    |
| [`calimero-desktop`](#calimero-desktop)         | Integrating apps with Calimero Desktop SSO                |
| [`calimero-node`](#calimero-node)               | Node operator quick-start (merod + meroctl overview)      |
| [`calimero-merod`](#calimero-merod)             | merod daemon deep-dive — init, config, health             |
| [`calimero-meroctl`](#calimero-meroctl)         | Complete meroctl CLI reference and scripting              |
| [`calimero-merobox`](#calimero-merobox)         | Local multi-node dev environments and CI                  |
| [`calimero-registry`](#calimero-registry)       | Signing and publishing apps to the registry               |
| [`calimero-abi-codegen`](#calimero-abi-codegen) | Generate TypeScript clients from WASM ABI manifests       |

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

For developers building **Calimero WASM applications** in Rust.

Covers:

- App skeleton with `#[app]` macros
- CRDT state collections (`UnorderedMap`, `Vector`, `Set`)
- Event emission with `app::emit!()`
- Private vs shared storage
- WASM runtime constraints (no threads, no `async`, no std I/O)
- Reference examples (kv-store, collaborative-editor)

Key rules included:

- Never use `std::collections` for state — CRDT collections only
- `#[app]` macro goes on the `impl` block, not the struct
- No `println!` — use `env::log()`

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

For developers building **frontends or Node.js services** that connect to a Calimero node.

Covers:

- Authentication and token storage
- JSON-RPC calls (mutations and views)
- WebSocket event subscriptions
- SSO token reading from URL hash

Key rules included:

- `mero-js` v2 uses camelCase (`contextId`, not `context_id`)
- Always handle 401 with token refresh before surfacing errors

```bash
npx @calimero-network/agent-skills calimero-client-js
```

---

### calimero-registry

For developers **publishing apps** to the Calimero App Registry.

Covers:

- `mero-sign` installation (crates.io and from source)
- Key generation and security
- `manifest.json` format and required fields
- Signing workflow (RFC 8785 canonicalization + Ed25519)
- `calimero-registry bundle create` and `bundle push`
- Team / org signing patterns

Key rules included:

- Sign the manifest **before** bundling — not after
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

### calimero-merobox

For developers setting up **local multi-node environments** or CI pipelines.

Covers:

- Merobox installation
- Workflow YAML format
- Multi-node setup with app deployment and context creation
- GitHub Actions integration template

Key rules included:

- Docker must be running before any merobox command

```bash
npx @calimero-network/agent-skills calimero-merobox
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

For developers **generating typed TypeScript clients** from a Calimero app's ABI manifest.

Covers:

- CLI usage (`npx calimero-abi-codegen -i abi.json -o src/generated`)
- ABI manifest format (`wasm-abi/1` schema, types, methods, events)
- Generated output shape (`types.ts` + `{ClientName}.ts`)
- Programmatic API for custom codegen pipelines
- Integrating codegen into your build script

Key rules included:

- ABI must have `"schema_version": "wasm-abi/1"` — other values are rejected
- Method, event, and type names must all be unique; map keys must be string

```bash
npx @calimero-network/agent-skills calimero-abi-codegen
```

---

## Structure

Each skill follows this layout:

```
skills/<skill-name>/
├── SKILL.md          # Agent instructions: what to know, what to avoid
├── references/       # Detailed API guides with real code examples
└── rules/            # Hard rules: one file per rule, named after the rule
```

The install script appends skill content to your editor's context file, wrapped in markers so
re-running updates the block cleanly.

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
