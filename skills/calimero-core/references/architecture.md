# Calimero 1.0 Architecture

Source: core's protocol reference (`docs/src/content/docs/protocol/`: `overview`, `concepts`,
`system-group`, `replication`, `reads`).

## A cluster

```text
cluster "eu1"
├── system group (group 1, on every node)
│   ├── nodes            1 → https://n1…, 2 → https://n2…, …
│   ├── packages         chat 1.2.0 { signer did:key:z…, services, .mpk hash }
│   ├── bundles          hash → { size, uploaded by, release }
│   ├── accounts         ada { passkeys, labels, aliases }
│   ├── credentials      API-key hashes, refresh tokens, used decision proofs
│   ├── organizations    acme { members, teams, approvals, upgrade runs }, ada's personal one
│   └── apps (directory) app-7f… { bundle, owner, org, access, replicas [1,2,3], group 12 }
└── app groups
    ├── group 12 on nodes 1,2,3  ← app-7f…'s log and state
    └── group 13 on nodes 2,3,4  ← another instance
```

- **The system group** is replicated to every node, so any node answers who an account is and where
  an app lives. Three nodes vote; the rest follow it as learners.
- **An app group** is replicated only to the instance's replicas (`--replicas`, default 3). A
  request that reaches another node is forwarded to the app's leader over a peer sealed channel.
- **Why two kinds**: who may do what must hold on every node before the next request (removing a
  member, revoking a key), so it is one cluster-wide log. An app's calls are ordered only against
  each other, so each instance gets its own log and leader, and apps progress in parallel. An app's
  data is held only by the nodes placed to hold it, which is what lets an owner restrict which
  images may hold it.

## Placement

A new instance is placed on `--replicas` nodes, spread across zones, least-loaded first. The
operator moves replicas (`meroctl ops move INSTANCE --replicas 2,3,4`); see `calimero-node`.

## Writes: calls

1. The client sends a sealed `POST /apps/{app}/intents { method, args, idempotencyKey }`.
2. The receiving node authenticates the credential and checks the instance's access rule against
   fresh system state (a caller who does not reach the instance gets `404`).
3. The app's leader runs the component over a copy-on-write overlay and appends
   `{ call, outcome { result, diff, events } }`. A majority acknowledges; every replica applies the
   diff. An entry built on state that changed meanwhile applies as a no-op and the call runs again.
4. The answer is `{ index, result, events, receipt }`. The receipt is the answering node's Ed25519
   signature over the app, the index and the result, under a key its attestation binds.

A retry with the same idempotency key is answered from the record, never run twice. An app error is
`422 APP_ERROR` (`details.code` is the `#[app::error]` variant); a trap `422 TRAP`, with nothing
written.

## Reads: views

`POST /apps/{app}/views { method, args, consistency?, minIndex? }` runs a view method and writes
nothing. Strong (the default) answers after the replica applied the leader's read index, so it sees
every committed write; `consistency: "stale"` answers from the replica as it stands, and `minIndex`
waits until it applied that index.

## Events

`GET /apps/{app}/events?from=N` is a server-sent event stream: the instance's committed events from
log index `N`, then live ones, each sent only to the accounts its audience names. Read the state
with a view, then follow from the view's `index + 1`, so nothing is missed or seen twice.

```bash
meroctl instance watch kv --from 0 --limit 10   # the same stream, as JSON lines
```

## What a node holds

- One sealed RocksDB per node (`calimero-log`): every group's log, snapshots and state, plus blobs
  and bundles in a sealed blob store.
- The cluster key K_c seals everything; it is kept wrapped under the node's storage key K_r, which
  mero-kms releases only to an attested image of a signed mero-tee release.
- Backups (`--backup-dir`) open only on a node holding the same K_c; a recovery disk
  (`--recovery-dir`) holds copies sealed to the key of whoever upgrades each app.

## Apps on the engine

An app is a `calimero:app` component (WIT world, `wasm32-wasip2`), built from Rust with
`calimero-sdk` and `meroctl app build`, run on wasmtime with fuel, wall-clock and memory limits per
call. It reads its caller and organization through the SDK (`env::caller()`, `env::org()`,
`env::in_team(...)`); finer permissions than "who reaches the instance" are the app's own code. See
`calimero-rust-sdk`.
