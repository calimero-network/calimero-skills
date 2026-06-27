# Context Lifecycle

A **context** is an isolated instance of an application with its own members, CRDT state, and
storage.

## App vs Context

| Concept     | What it is                 | Analogy              |
| ----------- | -------------------------- | -------------------- |
| Application | WASM binary + manifest     | A class / template   |
| Context     | Running instance of an app | An object / instance |

One application can power many independent contexts. Each context has completely isolated state.

## Lifecycle

```text
App installed on node
       │
       ▼
Context created (init() called → initial state set)
       │
       ▼
Members join via namespace/group membership
       │
       ├─ Methods called (mutations + views)
       ├─ Events emitted to members
       ├─ State synced across all member nodes (CRDT)
       │
       ▼
Context deleted (state and storage wiped)
```

## Creating a context

A context is always bound to a **group**, so create a namespace (the root group) first and pass its
id as `--group-id` — `context create` **requires** `--group-id`.

```bash
meroctl --node node1 namespace create --application-id <application-id>
# Returns: namespace-id (also a group id)

meroctl --node node1 context create --application-id <application-id> --group-id <namespace-id>
# Returns: context-id
```

Dev mode — auto-reinstalls when the WASM file changes (`--group-id` still required):

```bash
meroctl --node node1 context create --watch path/to/app.wasm --group-id <namespace-id>
```

## Multi-node participation (namespace + group model)

Nodes join a context via **namespaces** (root groups). The inviting node creates a namespace
invitation; joining nodes accept it, then join the context via group membership.

```bash
# ── Node A (creator) ──
meroctl --node node1 namespace create --application-id <app-id>
# → <namespace-id>

meroctl --node node1 context create --application-id <app-id> --group-id <namespace-id>
# → <context-id>

meroctl --node node1 namespace invite <namespace-id>
# → invitation JSON — share with Node B

# ── Node B (joiner) ──
meroctl --node node2 namespace join <namespace-id> '<invitation-json>'

meroctl --node node2 group join-context <context-id>
# Node B now participates and syncs CRDT state from Node A
```

## State synchronization

- Sync is **automatic** — no code needed to trigger it
- All context members receive mutations from all other members
- Conflicts are resolved deterministically by the CRDT engine
- Sync works offline — changes queue up and merge when reconnected
- Manual sync: `meroctl --node node1 context sync <context-id>`
