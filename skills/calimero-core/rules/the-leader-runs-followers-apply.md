# Rule: The leader runs, followers apply — no gossip, no CRDT merging

## What's wrong

Code, prompts or docs that assume 0.x's peer-to-peer model:

- every node runs every call and merges state with CRDTs, so state must be built from CRDT types and
  handle concurrent edits arriving out of order;
- nodes sync by gossip, so a client calls `context sync` or waits for peers;
- a node "joins a context" and holds its state locally.

<!-- validate-ignore: no-0x-commands (intentional WRONG example: 0.x commands) -->

```bash
meroctl context sync <ctx>            # WRONG: gone, Raft replicates
meroctl --node node1 peers            # WRONG: gone, no gossip network
```

## What's correct

Each app instance has **its own Raft log**. Its **leader** runs every call against the current state
and appends the call with its result, its exact storage writes (the diff) and its events. Followers
apply that diff in log order; nobody re-executes. So:

- **Calls are linearized**: two writes to one instance never race. Use plain collections (`Table`,
  `UnorderedMap`, `Cell`, `Counter`, ...); the only CRDT left is `Text`, for edits typed against a
  stale view.
- **No sync step**: a committed call is on a majority of replicas when its answer returns. A read
  that must see a write passes the write's index (`meroctl call ... --view --min-index N`) or uses a
  strong view (the default).
- **Clients never hold state**: a member's client reads through a node, over the sealed channel.

```bash
meroctl call -i kv set --args '{"key":"a","value":"1"}'          # answers { index, result, receipt }
meroctl call -i kv get --args '{"key":"a"}' --view --min-index 7
meroctl instance watch kv --from 0                               # committed events, then live
```

## Why

core 1.0 runs each app on a few attested TDX nodes that can afford coordination. One leader per
instance makes authorization one verdict, makes execution free to read the clock and randomness
once, and removes the merge semantics 0.x apps had to design around.
