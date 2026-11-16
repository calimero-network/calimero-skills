# Calimero Network — Agent Skills

This package provides AI agent skills for building on the Calimero Network stack.

## Available Skills

Install the starter set for building an app (`calimero-core`, `calimero-rust-sdk`,
`calimero-client-js`, `calimero-meroctl`, `calimero-abi-codegen`, `calimero-registry`) as Claude
Code skills with one command; `all` installs every skill:

```bash
npx @calimero-network/agent-skills app
```

Several names install at once. The default target is Claude Code skills in `.claude/skills/`
(`--global`: `~/.claude/skills/`); `--claude-md`, `--cursor` and `--copilot` write one block per
skill into `CLAUDE.md`, `.cursorrules` or `.github/copilot-instructions.md` instead.

| Skill                  | Install command                                           | When to use                                                   |
| ---------------------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| `calimero-core`        | `npx @calimero-network/agent-skills calimero-core`        | How core 1.0 works: instances, Raft logs, orgs, auth, trust   |
| `calimero-rust-sdk`    | `npx @calimero-network/agent-skills calimero-rust-sdk`    | Building Rust apps (core 1.0 component SDK)                   |
| `calimero-sdk-js`      | `npx @calimero-network/agent-skills calimero-sdk-js`      | A project on the gone 0.x JS app SDK: what replaces it        |
| `calimero-client-js`   | `npx @calimero-network/agent-skills calimero-client-js`   | Browser/Node.js frontends on mero-js `CalimeroClient`         |
| `calimero-client-py`   | `npx @calimero-network/agent-skills calimero-client-py`   | Python scripts, services and operator automation              |
| `calimero-abi-codegen` | `npx @calimero-network/agent-skills calimero-abi-codegen` | Typed app clients with `meroctl app codegen`                  |
| `calimero-registry`    | `npx @calimero-network/agent-skills calimero-registry`    | Signing and publishing apps to the registry                   |
| `calimero-meroctl`     | `npx @calimero-network/agent-skills calimero-meroctl`     | meroctl 1.0: local cluster, sign-in, instances, calls, orgs   |
| `calimero-node`        | `npx @calimero-network/agent-skills calimero-node`        | Operating a cluster: `meroctl ops`, nodes, backups, upgrades  |
| `calimero-merod`       | `npx @calimero-network/agent-skills calimero-merod`       | The `merod` binary: init, config, run, local, inspect, attest |
| `calimero-desktop`     | `npx @calimero-network/agent-skills calimero-desktop`     | Desktop hash-token SSO in a project: 0.x only, what 1.0 uses  |

## Auto-Detection

Skills should be loaded when the following are detected in the project:

| Signal                                                                  | Load skill                                               |
| ----------------------------------------------------------------------- | -------------------------------------------------------- |
| `calimero-sdk` in `Cargo.toml`                                          | `calimero-rust-sdk`                                      |
| `@calimero-network/calimero-sdk-js` in `package.json`                   | `calimero-sdk-js` (0.x, gone), then `calimero-rust-sdk`  |
| `@State` / `@Logic` decorators in TypeScript source                     | `calimero-sdk-js` (0.x, gone), then `calimero-rust-sdk`  |
| `calimero-sdk build` in any script                                      | `calimero-sdk-js` (0.x, gone), then `calimero-rust-sdk`  |
| `@calimero-network/mero-js` in `package.json`                           | `calimero-client-js`                                     |
| `meroctl app pack` / `sign` / `publish` in any script or workflow       | `calimero-registry`                                      |
| `calimero-registry` CLI usage                                           | `calimero-registry`                                      |
| `[package.metadata.calimero]` in `Cargo.toml`                           | `calimero-registry`                                      |
| `meroctl app codegen` in any script, or a generated `client.ts`         | `calimero-abi-codegen`                                   |
| `calimero-client-py` in `requirements.txt` or `pyproject.toml`          | `calimero-client-py`                                     |
| `meroctl ops` or `--ops-token` in any script                            | `calimero-node`                                          |
| `merod init` / `merod run`, or a `MEROD_*` variable in a deployment     | `calimero-merod`                                         |
| `access_token` read from `window.location.hash`, or `parseAuthCallback` | `calimero-desktop` (0.x only), then `calimero-client-js` |

## About Calimero

Calimero 1.0 is a confidential cloud for collaborative apps. Apps are written in Rust and compiled
to `calimero:app` WebAssembly components; each app instance is replicated by its own Raft log across
attested TDX nodes, which clients reach through a sealed channel after verifying the node's
attestation.

Core concepts:

- **Organization** — the access boundary: accounts with roles (`guest < member < admin < owner`) and
  teams
- **App instance** — one running copy of an app, in an organization, with its own log and state
- **Package** — a signed `.mpk` bundle (component + manifest) an instance is created from
- **Account** — a person (passkeys are its devices) or a machine (API keys)
- **Node** (`merod`) — runs app instances on its cluster; `merod local` starts a development cluster

The SDK 0.12 model (contexts, CRDT state on every node, JSON-RPC, identities and executor keys) is
gone since core 1.0.0-rc.9, and every skill here teaches core 1.0 (1.0.0-rc.30). Two skills now
exist mainly to redirect: core ships no JavaScript app SDK (`calimero-sdk-js`: write apps in Rust),
and Calimero Desktop still runs the 0.x node, so its hash-token SSO does not apply to 1.0
(`calimero-desktop`: sign in with passkeys through mero-js).

Tooling: `meroctl` is the one CLI from core 1.0.0-rc.24. It starts, builds, generates clients for,
packs, signs and publishes an app
(`meroctl app new|build|codegen|abi|signer|pack|sign|inspect|publish`) and runs a development
cluster (`meroctl local up|dev|test`, `meroctl local compute run`). `mero-app-build`, `mero-sign`,
`mero-compute`, `scripts/pack-component.py`, `create-mero-app`, `cargo-mero`, merobox, the npm
`@calimero-network/abi-codegen` and the `install-sh` repository are gone; install `meroctl` with
`curl -fsSL https://raw.githubusercontent.com/calimero-network/core/master/scripts/install.sh | sh`.
