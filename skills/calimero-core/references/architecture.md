# Calimero Architecture

## What merod is

`merod` is the Calimero node daemon. It:

- Hosts and executes WASM applications inside isolated contexts
- Manages persistent CRDT storage per context
- Exposes a JSON-RPC + WebSocket API on a configurable HTTP port
- Participates in a P2P network on a separate swarm port for state sync
- Issues and validates JWT tokens for client auth

One `merod` process = one node. Multiple nodes can be run on the same machine with different
`--node` names and different ports.

## What a Context is

A **context** is a sandboxed instance of a WASM application with:

- Its own isolated CRDT state (not shared with other contexts, even of the same app)
- Its own set of **members** (identities that can call methods and receive events)
- Its own blob storage
- A unique `context-id` (hex string)

When a context is created, the app's `init()` / `@Init` method is called once to seed the initial
state.

## What an Application is

An **application** is a compiled WASM binary + optional manifest. It has:

- A unique `application-id` assigned at install time
- No state of its own — state lives in contexts that instantiate it
- One app can power many independent contexts

Installing an app does NOT create a context. These are always two separate steps.

## What an Identity is

An **identity** is an Ed25519 keypair managed by the node:

- `identityId` — the base58-encoded public key, used as `executorPublicKey` in RPC calls
- Identities are created per node (`meroctl identity create`)
- An identity participates in a context as a member

## Call path for an app method

```text
Client
  │  POST /api/v0/context/{contextId}/execute
  │  { method, argsJson, executorPublicKey }
  ▼
merod HTTP handler
  │  validates JWT, resolves context
  ▼
WASM executor
  │  deserializes state from CRDT storage
  │  calls the method
  │  serializes mutations back to storage
  ▼
CRDT sync engine
  │  broadcasts mutation to all context members (P2P)
  ▼
WebSocket subscribers
     receive ExecutionEvent / StateMutation
```

## Sync model

State sync is automatic and happens over the P2P network:

- All context members receive all mutations from all other members
- Conflicts are resolved deterministically by the CRDT merge rules
- Sync works offline — mutations queue and merge on reconnect
- Manual sync trigger: `meroctl context sync <context-id>`

## Multi-node participation

Nodes join contexts through the namespace + group model:

```text
Node A creates a namespace (trust root)
  → Node A creates a context
  → Node A generates namespace invite token
  → Node B accepts the invite (joins namespace)
  → Node B joins the context via group membership
  → Both nodes now sync CRDT state for that context
```

Once joined, state sync is fully automatic. Node B receives all future mutations from Node A (and
vice versa) without any further configuration.

## Port assignment

| Port                           | Purpose                                            |
| ------------------------------ | -------------------------------------------------- |
| `--server-port` (default 2428) | HTTP/WS API — clients and meroctl connect here     |
| `--swarm-port` (default 2528)  | P2P swarm — inter-node state sync, invite protocol |

These ports must be accessible to meroctl and app clients (server port), and to other nodes for sync
(swarm port).
