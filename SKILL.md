# Calimero Network — Agent Skills

This package provides AI agent skills for building on the Calimero Network stack.

## Available Skills

| Skill                  | Install command                                           | When to use                                                        |
| ---------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ |
| `calimero-rust-sdk`    | `npx @calimero-network/agent-skills calimero-rust-sdk`    | Building Rust WASM applications that run on a node                 |
| `calimero-sdk-js`      | `npx @calimero-network/agent-skills calimero-sdk-js`      | Building TypeScript/JS WASM applications that run on a node        |
| `calimero-client-js`   | `npx @calimero-network/agent-skills calimero-client-js`   | Browser/Node.js frontends connecting to a node (not building apps) |
| `calimero-registry`    | `npx @calimero-network/agent-skills calimero-registry`    | Signing and publishing apps to the registry                        |
| `calimero-desktop`     | `npx @calimero-network/agent-skills calimero-desktop`     | Integrating apps with Calimero Desktop SSO                         |
| `calimero-node`        | `npx @calimero-network/agent-skills calimero-node`        | Node operators and meroctl scripting                               |
| `calimero-merobox`     | `npx @calimero-network/agent-skills calimero-merobox`     | Local multi-node dev environments and CI                           |
| `calimero-client-py`   | `npx @calimero-network/agent-skills calimero-client-py`   | Python client for node automation and backend services             |
| `calimero-abi-codegen` | `npx @calimero-network/agent-skills calimero-abi-codegen` | Generate TypeScript clients from WASM ABI manifests                |

## Auto-Detection

Skills should be loaded when the following are detected in the project:

| Signal                                                                 | Load skill             |
| ---------------------------------------------------------------------- | ---------------------- |
| `calimero-sdk` in `Cargo.toml`                                         | `calimero-rust-sdk`    |
| `@calimero-network/calimero-sdk-js` in `package.json`                  | `calimero-sdk-js`      |
| `@State` / `@Logic` decorators in TypeScript source                    | `calimero-sdk-js`      |
| `calimero-sdk build` in any script                                     | `calimero-sdk-js`      |
| `@calimero-network/calimero-client` in `package.json`                  | `calimero-client-js`   |
| `@calimero-network/mero-js` in `package.json`                          | `calimero-client-js`   |
| `mero-sign` in any script or Makefile                                  | `calimero-registry`    |
| `calimero-registry` CLI usage                                          | `calimero-registry`    |
| `access_token` read from `window.location.hash`                        | `calimero-desktop`     |
| `readDesktopSSO` / `hash.get('access_token')` pattern in frontend code | `calimero-desktop`     |
| `merobox` in `package.json` or `requirements.txt`                      | `calimero-merobox`     |
| `calimero-client-py` in `requirements.txt` or `pyproject.toml`         | `calimero-client-py`   |
| `calimero-abi-codegen` or `abi.json` in project                        | `calimero-abi-codegen` |

## About Calimero

Calimero is a framework for distributed, peer-to-peer applications with automatic CRDT-based data
synchronization, user-owned data, and verifiable off-chain computing.

Core concepts:

- **Context** — an isolated application instance with its own state, members, and storage
- **Application** — WASM code deployed to a node; each context runs one application
- **Node** (`merod`) — the runtime that hosts apps, syncs state, and exposes JSON-RPC/WebSocket
- **Identity** — root key → client keys per device; JWT tokens for API auth
- **CRDT state** — conflict-free replicated data; state lives on node storage, synced across context
  members
