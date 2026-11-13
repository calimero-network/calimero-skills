# Calimero Network — Agent Skills

This package provides AI agent skills for building on the Calimero Network stack.

## Available Skills

| Skill                  | Install command                                           | When to use                                                 |
| ---------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| `calimero-rust-sdk`    | `npx @calimero-network/agent-skills calimero-rust-sdk`    | Building Rust apps (core 1.0 component SDK)                 |
| `calimero-sdk-js`      | `npx @calimero-network/agent-skills calimero-sdk-js`      | Building TypeScript/JS WASM applications that run on a node |
| `calimero-client-js`   | `npx @calimero-network/agent-skills calimero-client-js`   | Browser/Node.js frontends on mero-js `CalimeroClient`       |
| `calimero-registry`    | `npx @calimero-network/agent-skills calimero-registry`    | Signing and publishing apps to the registry                 |
| `calimero-desktop`     | `npx @calimero-network/agent-skills calimero-desktop`     | Integrating apps with Calimero Desktop SSO                  |
| `calimero-node`        | `npx @calimero-network/agent-skills calimero-node`        | Node operators and meroctl scripting                        |
| `calimero-client-py`   | `npx @calimero-network/agent-skills calimero-client-py`   | Python client for node automation and backend services      |
| `calimero-abi-codegen` | `npx @calimero-network/agent-skills calimero-abi-codegen` | Typed app clients with `meroctl app codegen`                |

## Auto-Detection

Skills should be loaded when the following are detected in the project:

| Signal                                                                 | Load skill             |
| ---------------------------------------------------------------------- | ---------------------- |
| `calimero-sdk` in `Cargo.toml`                                         | `calimero-rust-sdk`    |
| `@calimero-network/calimero-sdk-js` in `package.json`                  | `calimero-sdk-js`      |
| `@State` / `@Logic` decorators in TypeScript source                    | `calimero-sdk-js`      |
| `calimero-sdk build` in any script                                     | `calimero-sdk-js`      |
| `@calimero-network/mero-js` in `package.json`                          | `calimero-client-js`   |
| `meroctl app pack` / `sign` / `publish` in any script or workflow      | `calimero-registry`    |
| `calimero-registry` CLI usage                                          | `calimero-registry`    |
| `[package.metadata.calimero]` in `Cargo.toml`                          | `calimero-registry`    |
| `access_token` read from `window.location.hash`                        | `calimero-desktop`     |
| `readDesktopSSO` / `hash.get('access_token')` pattern in frontend code | `calimero-desktop`     |
| `calimero-client-py` in `requirements.txt` or `pyproject.toml`         | `calimero-client-py`   |
| `meroctl app codegen` in any script, or a generated `client.ts`        | `calimero-abi-codegen` |

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
gone since core 1.0.0-rc.9. Skills not yet updated to 1.0 (`calimero-core`, `calimero-node`,
`calimero-merod`, `calimero-meroctl`, `calimero-sdk-js`, `calimero-desktop`, `calimero-client-py`)
may still describe it; prefer `calimero-rust-sdk`, `calimero-client-js`, `calimero-abi-codegen` and
`calimero-registry` where they disagree.

Tooling: `meroctl` is the one CLI from core 1.0.0-rc.24. It starts, builds, generates clients for,
packs, signs and publishes an app
(`meroctl app new|build|codegen|abi|signer|pack|sign|inspect|publish`) and runs a development
cluster (`meroctl local up|dev|test`, `meroctl local compute run`). `mero-app-build`, `mero-sign`,
`mero-compute`, `scripts/pack-component.py`, `create-mero-app`, `cargo-mero`, merobox, the npm
`@calimero-network/abi-codegen` and the `install-sh` repository are gone; install `meroctl` with
`curl -fsSL https://raw.githubusercontent.com/calimero-network/core/master/scripts/install.sh | sh`.
