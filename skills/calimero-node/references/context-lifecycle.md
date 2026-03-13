# Context Lifecycle

A **context** is an isolated instance of an application with its own members, CRDT state, and storage.

## App vs Context

| Concept | What it is | Analogy |
| --- | --- | --- |
| Application | WASM binary + manifest | A class / template |
| Context | Running instance of an app | An object / instance |

One application can power many independent contexts. Each context has completely isolated state.

## Lifecycle

```
App installed on node
       │
       ▼
Context created (init() called → initial state set)
       │
       ▼
Members invited and joined
       │
       ├─ Methods called (mutations + views)
       ├─ Events emitted to members
       ├─ State synced across all member nodes (CRDT)
       │
       ▼
Context deleted (state and storage wiped)
```

## Creating a context

```bash
meroctl context create --app-id <app-id>
# Returns: context-id
```

## Inviting members

```bash
# On node A — generate an invitation
meroctl context invite <context-id> --identity <identity-on-node-A>
# Returns: invitation payload (share this with the new member)

# On node B — accept the invitation
meroctl context join --invitation <paste-invitation-payload>
```

After joining, node B's state will sync from node A. From that point both nodes
participate in CRDT state synchronization.

## State synchronization

- Sync is **automatic** — no code needed to trigger it
- All context members receive mutations from all other members
- Conflicts are resolved deterministically by the CRDT engine
- Sync works offline — changes queue up and merge when reconnected
