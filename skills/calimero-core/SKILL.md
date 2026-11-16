---
name: calimero-core
description:
  'How Calimero core 1.0 works: app instances replicated by their own Raft logs, organizations,
  teams and roles, accounts and passkeys, attestation and signed packages. Use for any Calimero
  development, next to a hands-on skill, when you need the model behind the commands.'
---

# calimero-core — Agent Instructions

You are helping a developer understand **how Calimero 1.0 works**: the model every app, client and
operator builds on. Use it with a hands-on skill: `calimero-rust-sdk` (apps), `calimero-client-js`
or `calimero-client-py` (clients), `calimero-meroctl` (the CLI), `calimero-node` and
`calimero-merod` (operators), `calimero-registry` (packages).

This skill teaches core 1.0 (1.0.0-rc.29). The 0.x model (contexts on a peer-to-peer network,
gossip, CRDT state merged on every node, JSON-RPC, context identities and executor keys, JWTs) is
gone since core 1.0.0-rc.9; see "What changed from 0.x" below.

## The one idea

Calimero is a confidential cloud for collaborative apps. An app is a `calimero:app` WebAssembly
component whose state lives on a **cluster** of attested Intel TDX nodes (`merod`).

- **One Raft log per app instance.** Each instance is replicated on a few nodes (3 by default). Its
  **leader** runs every call against the current state and appends the call with what it produced:
  the result, the exact storage writes (the **diff**) and the events. **Followers apply the diff**
  in log order; nobody runs the call a second time.
- **One Raft log for the cluster**, the **system group** (group 1, on every node): nodes, accounts
  and their passkeys, sessions and API keys, organizations and teams, installed packages and the
  directory of app instances. Every command names its actor, and the state machine checks that
  actor's authority when it applies, so the log alone decides every outcome.
- **Nothing crosses a trust boundary unsealed.** A client verifies a node's TDX quote before it
  sends anything, then talks to it only through a **sealed channel** bound to the attested key.
  Everything on disk is sealed under the cluster key, which a node unwraps only with a storage key
  mero-kms releases to an attested image.

Consequences an app developer relies on:

- **Calls are linearized.** Two writes to one instance never race; the second runs against what the
  first left. State is plain collections with nothing to merge (only `Text` stays a sequence CRDT).
- **Execution need not be deterministic.** `time_now` and random bytes are read once, on the leader.
- **Authorization is one verdict**, judged against the same system state on every replica.
- **A client never holds app state**: it reads through a node.

## The nouns

| Term                        | What it is                                                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cluster**                 | `merod` nodes sharing one system group and one cluster key; named by `--cluster`                                                                                                                |
| **Node**                    | one `merod` process in a TDX VM, with a numeric id and a public URL; a **job node** runs compute only                                                                                           |
| **App instance**            | one running copy of an application: a bundle, an owner, its organization, an access rule, its own log and state. v1's _context_; `meroctl instance`. Its id is 16 random bytes, base64url       |
| **Bundle**                  | one `calimero:app` component, named by `hex(SHA-256(wasm))`                                                                                                                                     |
| **Package** / **release**   | a signed `.mpk`: package name, version, services (bundles, optional compute component), frontend, pipelines, outbound prefixes. Its publisher's key (the **signer**) is pinned by its first one |
| **Account**                 | a person; each **passkey** is one of its devices. Machines act for an account with an **API key** (`cal_…`)                                                                                     |
| **Organization** / **team** | members with roles `guest < member < admin < owner`, and nested teams. Every instance is in exactly one organization; every account has a **personal organization**                             |
| **Operator**                | whoever runs the machines: the ops token and the operator key; sees counts and Raft status, never app data                                                                                      |

meroctl's spellings: `instance` (was `context`), `org` (was `namespace`), `team` (was `group`),
`app` (signed packages, v1's applications). In the protocol, a **group** is a Raft log, not a team.

## The life of a call

```text
client ── GET /attestation?nonce=…        ──▶ any node     verify the quote and its release
client ── Noise NK handshake to that key   ──▶ any node
client ── sealed POST /apps/{app}/intents ──▶ any node     credential + access, on fresh system state
                                     any node ──▶ app leader   forwarded over a peer sealed channel
                                     leader: run the component, append { call, outcome { result, diff, events } }
                                     majority acknowledges; every replica applies the same diff
client ◀── { index, result, events, receipt }   receipt signed by an attested key
```

A read is `POST /apps/{app}/views` (no log entry); the event stream is
`GET /apps/{app}/events?from=N` (server-sent events: committed events from index `N`, then live
ones).

## What changed from 0.x

| 0.x                                                   | core 1.0                                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| context on a P2P network, state synced by gossip      | app instance replicated by its own Raft log on a few attested nodes                        |
| CRDT collections merged on every node                 | plain collections; the leader runs, followers apply its diff (`Text` is the one CRDT left) |
| context identities, executor keys, invitations by key | accounts (passkeys, API keys) in organizations; access rules on each instance              |
| namespace / group (root group, subgroups)             | organization / team (`meroctl org`, `meroctl team`)                                        |
| `POST /jsonrpc` with `{ jsonrpc, method: "execute" }` | `POST /apps/{app}/intents` (calls) and `/views` (reads), sealed                            |
| WebSocket subscriptions                               | `GET /apps/{app}/events?from=N` (server-sent events), sealed                               |
| JWT access and refresh tokens                         | 15-minute passkey sessions with a single-use refresh token, or API keys                    |
| WASM core modules on wasmer (SDK 0.12)                | `calimero:app` components on wasmtime; a 0.12 bundle is refused (`400 UNSUPPORTED_BUNDLE`) |

## References

- `references/architecture.md`: cluster, nodes, the system group, app groups, placement, the call
  path, reads and events.
- `references/organizations-and-access.md`: organizations, roles, teams, access rules, invites.
- `references/accounts-and-keys.md`: accounts, passkeys, sessions, API keys, step-ups, the operator.
- `references/attestation-and-packages.md`: attestation, the sealed channel, receipts, packages,
  signers and frontends.

## Rules

- `rules/the-leader-runs-followers-apply.md`: no gossip, no CRDT merging, no sync commands.
- `rules/instance-is-not-package.md`: a package is code; an instance is one running copy of it.
