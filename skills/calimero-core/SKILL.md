# calimero-core — Agent Instructions

You are helping a developer understand the **core Calimero runtime** — the mental model,
protocols, and primitives that every application, client library, and node operator needs
to know.

> Use this skill alongside a language-specific skill (`calimero-rust-sdk`,
> `calimero-sdk-js`, `calimero-client-js`, etc.) to give the AI full-stack context.

## The three-layer model

```
┌─────────────────────────────────────────────────────┐
│  Application logic (WASM)                            │  calimero-rust-sdk / calimero-sdk-js
│  @State / #[app::state], CRDT collections           │
└────────────────────────┬────────────────────────────┘
                         │ JSON-RPC calls + WebSocket events
┌────────────────────────▼────────────────────────────┐
│  merod node runtime                                  │  calimero-merod
│  Hosts WASM, manages storage, exposes HTTP/WS API   │
└────────────────────────┬────────────────────────────┘
                         │ meroctl CLI / HTTP clients / Python client
┌────────────────────────▼────────────────────────────┐
│  Clients & tooling                                   │  calimero-client-js / calimero-client-py
│  mero-js, mero-react, calimero-client-py            │  calimero-meroctl
└─────────────────────────────────────────────────────┘
```

## Core concepts

### Application vs Context

| Concept | What it is | Analogy |
|---|---|---|
| **Application** | WASM binary + manifest; the code | A class / template |
| **Context** | A running instance of an app; has isolated state, members, storage | An object / instance |

One application can power many independent contexts. State is never shared across contexts.

### Identity

An **identity** is an Ed25519 keypair. Each context member has an identity on the node.
The identity's public key is used:
- As `executorPublicKey` in RPC calls (who is calling)
- For signing mutations in the CRDT sync protocol

### Namespace and Group

| Concept | Role |
|---|---|
| **Namespace** | A root trust anchor shared across nodes; created by one node, others join via invite token |
| **Group** | Sub-grouping within a namespace; contexts are joined via group membership |

Multi-node participation requires: create namespace → invite peer → peer joins namespace → peer joins context via group.

## How calls work (JSON-RPC)

All application method calls go through the node's JSON-RPC endpoint:

```
POST http://localhost:2428/api/v0/context/{contextId}/execute
Authorization: Bearer <access_token>

{
  "method": "get_posts",
  "argsJson": "{}",
  "executorPublicKey": "<base58-pubkey>"
}
```

- **Mutations** (methods taking `&mut self`) change shared CRDT state; changes are synced
  to all context members automatically.
- **Views** (methods taking `&self`, annotated `@View` or returning read-only) do NOT
  persist state.
- There is no separate "query" endpoint — mutations and views use the same call path.
  The `--view` flag in `meroctl call` tells the client to skip state persistence.

## How events work (WebSocket)

Applications emit events with `app::emit!()` (Rust) or `env.emit()` (JS). Clients
subscribe via WebSocket to receive them in real time.

Two event types the node sends to subscribers:

| Type | When | Payload |
|---|---|---|
| `ExecutionEvent` | App called `app::emit!()` | `{ events: [{ kind, data }] }` |
| `StateMutation` | A member mutated shared state | `{ newRoot: string }` |

WebSocket endpoint: `ws://localhost:2428/ws`

## CRDT storage types

All shared application state uses conflict-free replicated data types from
`calimero_storage::collections`. Plain `HashMap`, `Vec`, or `HashSet` must never be used
for shared state.

| Type | Use for |
|---|---|
| `UnorderedMap<K, V>` | Key-value store (most common) |
| `Vector<T>` | Append-only ordered log |
| `UnorderedSet<T>` | Unique value set |
| `LwwRegister<T>` | Single last-write-wins scalar |
| `Counter` / `Counter<true>` | Grow-only / PN counter |
| `FrozenStorage<T>` | Immutable content-addressed blobs |
| `UserStorage<T>` | Per-member private storage (not synced) |
| `ReplicatedGrowableArray` | Collaborative text / ordered sequence |

## Authentication

The node uses short-lived JWT access tokens + long-lived refresh tokens:

```bash
# Get tokens
POST /api/v0/identity/login
{ "username": "admin", "password": "..." }
→ { "accessToken": "...", "refreshToken": "..." }

# Refresh
POST /api/v0/identity/refresh
{ "refreshToken": "..." }
→ { "accessToken": "..." }
```

Tokens are passed as `Authorization: Bearer <accessToken>` on all API calls.

## References

See `references/` for:
- Full JSON-RPC protocol and endpoint list
- WebSocket event schemas with decoding examples
- CRDT storage type guide
- Namespace and group model detail
- Architecture overview
