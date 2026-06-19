# calimero-core — Agent Instructions

You are helping a developer understand the **core Calimero runtime** — the mental model, protocols,
and primitives that every application, client library, and node operator needs to know.

> Use this skill alongside a language-specific skill (`calimero-rust-sdk`, `calimero-sdk-js`,
> `calimero-client-js`, etc.) to give the AI full-stack context.

## The three-layer model

```text
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

| Concept         | What it is                                                         | Analogy              |
| --------------- | ------------------------------------------------------------------ | -------------------- |
| **Application** | WASM binary + manifest; the code                                   | A class / template   |
| **Context**     | A running instance of an app; has isolated state, members, storage | An object / instance |

One application can power many independent contexts. State is never shared across contexts.

### Identity

An **identity** is an Ed25519 keypair. Each context member has an identity on the node. The
identity's public key is used:

- To identify the caller (resolved from the auth token, not sent as a request field)
- For signing mutations in the CRDT sync protocol

### Namespace and Group

| Concept       | Role                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------ |
| **Namespace** | A root trust anchor shared across nodes; created by one node, others join via invite token |
| **Group**     | Sub-grouping within a namespace; contexts are joined via group membership                  |

Multi-node participation requires: create namespace → invite peer → peer joins namespace → peer
joins context via group.

## How calls work (JSON-RPC)

All application method calls go through the node's JSON-RPC 2.0 endpoint at **`/jsonrpc`** (server
port default **2528**), with `method: "execute"`:

```text
POST http://localhost:2528/jsonrpc
Authorization: Bearer <access_token>

{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "execute",
  "params": {
    "context_id": "<context-id>",
    "method": "get_posts",
    "args_json": {},
    "substitute": []
  }
}
```

- `args_json` is a JSON **value** (object), not a double-encoded string. The caller identity comes
  from the auth token — there is **no `executorPublicKey`** field. (Management endpoints live under
  `/admin-api/...`; see `references/jsonrpc-protocol.md`.)
- **Mutations** (methods taking `&mut self`) change shared CRDT state; changes are synced to all
  context members automatically.
- **Views** (methods taking `&self`) do NOT persist state — a view is just a read-only method; there
  is no `--view` flag in `meroctl call`.

## How events work (WebSocket)

Applications emit events with `app::emit!()` (Rust) or `env.emit()` (JS). Clients subscribe via
WebSocket to receive them in real time.

Context events the node sends to subscribers (0.11):

| Type                | When                                    | Payload                                  |
| ------------------- | --------------------------------------- | ---------------------------------------- |
| `StateMutation`     | A member mutated shared state           | `{ newRoot, events?: ExecutionEvent[] }` |
| `SyncStatus`        | Sync progress/state changed             | sync state info                          |
| `AppVersionChanged` | The context's app was upgraded/migrated | new app version                          |
| `XCall`             | Cross-context call feedback             | xcall result info                        |

App `app::emit!()` events arrive **inside** `StateMutation.events`. See
`references/websocket-events.md`.

WebSocket endpoint: `ws://localhost:2528/ws`

## CRDT storage types

All shared application state uses conflict-free replicated data types from
`calimero_storage::collections`. Plain `HashMap`, `Vec`, or `HashSet` must never be used for shared
state.

| Type                             | Use for                                    |
| -------------------------------- | ------------------------------------------ |
| `UnorderedMap<K, V>`             | Key-value store (most common)              |
| `Vector<T>`                      | Append-only ordered log                    |
| `UnorderedSet<T>`                | Unique value set                           |
| `LwwRegister<T>`                 | Single last-write-wins scalar              |
| `Counter` / `Counter<true>`      | Grow-only / PN counter                     |
| `FrozenStorage<T>`               | Immutable content-addressed blobs          |
| `UserStorage<T>`                 | Per-member private storage (not synced)    |
| `ReplicatedGrowableArray`        | Collaborative text / ordered sequence      |
| `SortedMap` / `SortedSet`        | Ordered map/set — range/prefix/page (0.11) |
| `AuthoredMap` / `AuthoredVector` | Per-entry/slot author ownership (0.11)     |
| `SharedStorage<T>`               | Group-writable single value (0.11)         |

## Authentication

The node uses short-lived JWT access tokens + long-lived refresh tokens, issued by the node's auth
layer (auth mode is configured on the node — `proxy` or `embedded`). Tokens are passed as
`Authorization: Bearer <accessToken>` on all API calls except `/health`.

In practice, **let the client SDKs handle auth** — `calimero-client-js` / `mero-react` (web login +
token refresh) and `calimero-client-py` manage the login and refresh flow for you rather than
calling auth endpoints by hand.

## References

See `references/` for:

- Full JSON-RPC protocol and endpoint list
- WebSocket event schemas with decoding examples
- CRDT storage type guide
- Namespace and group model detail
- Architecture overview
