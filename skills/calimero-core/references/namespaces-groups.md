# Namespaces, Groups, and Contexts

Namespaces and groups are the multi-node participation primitives in Calimero. They control which
nodes can join which contexts and how trust is established between nodes. **A context is never
created on its own — it is always bound to a group, which lives inside a namespace.**

## Concepts

| Concept       | Role                                                                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Namespace** | A *root group* (a group with no parent). It is the application-instance boundary and identity scope — it gets its own Ed25519 keypair and is bound to one application. |
| **Group**     | A governance boundary *within* a namespace: members, roles/capabilities, and one or more contexts. Membership, access control, and upgrades all happen here. A namespace **is** its root group. |
| **Context**   | A running instance of a WASM app with its own isolated CRDT state. Each context belongs to **exactly one group**; joining a context requires membership in that group. |

Key consequences:

- The **namespace id is also a group id** (the root group), so it can be passed directly as
  `--group-id` when creating a context.
- **Access is by group membership.** Any member of a group can join any context in that group. With
  `auto_join: true` (the default), joining a group auto-subscribes the node to all its contexts.
- To restrict access to a subset of contexts, create a **subgroup** and bind those contexts to it —
  only that subgroup's members (direct or inherited) can join them.

---

## Single-machine flow (one node)

Even on a single node you create a namespace first — `meroctl context create` **requires**
`--group-id`.

```bash
# 1. Install the app bundle → application-id
meroctl --node node1 app install --path ./app.mpk
# → <application-id>

# 2. Create a namespace for the app (the namespace IS the root group)
meroctl --node node1 namespace create --application-id <application-id>
# → <namespace-id>   ← this id is also the namespace's root group id

# 3. Create a context bound to that group (--group-id is REQUIRED)
meroctl --node node1 context create \
  --application-id <application-id> \
  --group-id <namespace-id>
# → <context-id> + <member-public-key>

# 4. Call methods — METHOD is positional, the context is the --context flag.
#    A "view" is just a read-only method (no --view flag); `call` has no --as flag.
meroctl --node node1 call set --context <context-id> --args '{"key":"hello","value":"world"}'
meroctl --node node1 call get --context <context-id> --args '{"key":"hello"}'
```

---

## Full multi-node setup

### Node A: create, then invite

```bash
# 1. Install the app and create the namespace (root group)
meroctl --node node1 app install --path ./app.mpk
meroctl --node node1 namespace create --application-id <application-id>
# → <namespace-id>

# 2. Create a context bound to the root group
meroctl --node node1 context create \
  --application-id <application-id> --group-id <namespace-id>
# → <context-id>

# 3. Generate a namespace invitation for Node B
meroctl --node node1 namespace invite <namespace-id>
# → prints invitation JSON payload — share this with Node B out-of-band
```

### Node B: accept, then join the context

```bash
# 4. Join the namespace with the invitation
meroctl --node node2 namespace join <namespace-id> '<invitation-json>'

# 5. Join the context via group membership.
#    With auto_join (default) joining the namespace already subscribes you to its
#    contexts; run this only for the explicit/manual case.
meroctl --node node2 group join-context <context-id>
# Node B is now a context member and will sync CRDT state from Node A
```

After step 5, state sync is fully automatic. Both nodes send and receive mutations through the P2P
swarm.

---

## Restricting access with a subgroup

```bash
# Create a child group under the namespace → group-id
meroctl --node node1 namespace create-group <namespace-id> --alias finance-team
# → <group-id>

# Bind a context to that subgroup instead of the root group
meroctl --node node1 context create \
  --application-id <application-id> --group-id <group-id>
```

Only members of `finance-team` (direct, or inherited through an Open subgroup chain) can join
contexts bound to it.

---

## Namespace commands

```bash
# Create a namespace (root group) bound to an application — --application-id is required
meroctl namespace create --application-id <application-id>

# List namespaces on this node (root groups / application instances)
meroctl namespace list          # alias: meroctl namespace ls

# List the groups directly under a namespace
meroctl namespace groups <namespace-id>

# Create a child group inside a namespace
meroctl namespace create-group <namespace-id> --alias <name>

# Generate an invitation for a namespace (share the JSON with the joining node)
meroctl namespace invite <namespace-id>

# Join a namespace using an invitation
meroctl namespace join <namespace-id> '<invitation-json>'
```

---

## Group commands

```bash
# List groups
meroctl group list

# Join a context via group membership (after joining the namespace)
meroctl group join-context <context-id>
```

> `meroctl group create` is **deprecated** — use `meroctl namespace create` to create a namespace
> (root group) and `meroctl namespace create-group` to create subgroups.

---

## What happens after a node joins

1. The new member receives the full CRDT state from existing members.
2. Future mutations from any member are broadcast to all other members.
3. Offline mutations are queued and merged on reconnect — no data is lost.
4. The new member's identity can execute methods and its mutations are accepted by other members.

---

## Single-node vs multi-node

Namespaces/groups are required in **both** cases — a context is always bound to a group, so you
always run `namespace create` before `context create`. The difference is only that multi-node setups
additionally exchange `namespace invite` / `namespace join` so a second `merod` instance can share
the context.
