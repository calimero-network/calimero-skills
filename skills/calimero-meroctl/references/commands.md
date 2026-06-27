# meroctl Command Reference

## Global flags

```bash
meroctl --node <name> <cmd>           # registered node by name
meroctl --api <url> <cmd>             # direct URL, no registration
meroctl --home <path> <cmd>           # alternate config directory
```

---

## node — manage node connections

```bash
# Register a local node
meroctl node add <name> <path-to-calimero-home>

# Register a remote node
meroctl node add <name> <http-url>

# Set active (default) node
meroctl node use <name>

# List registered nodes
meroctl node ls

# Remove a node connection
meroctl node remove <name>

# Show this node's peer identity (public key)
meroctl node identity
```

---

## app — manage installed applications

```bash
# Install from local WASM file (--package/--version are optional metadata)
meroctl app install --path path/to/app.wasm
meroctl app install --path path/to/app.wasm --package com.example.myapp --version 1.0.0

# Install from local .mpk bundle
meroctl app install --path path/to/app.mpk

# Install from registry URL
meroctl app install --url https://apps.calimero.network/<app-id>/<version>

# List installed apps
meroctl app ls

# Get details of a specific app
meroctl app get <application-id>

# Uninstall an app (does not delete existing contexts)
meroctl app uninstall <application-id>
```

---

## context — manage contexts

```bash
# Create a context (instantiates app — calls init()). --group-id is REQUIRED: a context is
# always bound to a group. Pass the namespace-id from `namespace create` (a namespace is the
# root group), or a subgroup id from `namespace create-group`.
meroctl context create --application-id <application-id> --group-id <namespace-id>

# Create in dev mode (auto-reinstall when WASM file changes)
meroctl context create --watch path/to/app.wasm --group-id <namespace-id>

# List all contexts on this node
meroctl context ls

# Get details of a specific context
meroctl context get <context-id>

# Delete a context (wipes all state — irreversible)
meroctl context delete <context-id>

# Manually trigger state sync with peers
meroctl context sync <context-id>
```

---

## call — invoke app methods

The **method name is positional**; the context is passed with `--context` (or `-c`). There is **no
`--view` flag** — calling a read-only method just reads. `call` has **no `--as` flag** either; its
flags are `--args`, `--id`, `--substitute`, `-i`/`--interactive`, `--timeout`. (`--as` exists on
identity-aliasing subcommands like `context create`/`identity`, not on `call`.)

```bash
# Mutation — changes shared CRDT state
meroctl call <method-name> --context <context-id> --args '{"key":"val"}'

# View / read-only method (same form — a view is just a read-only method)
meroctl call <method-name> --context <context-id> --args '{}'

# Method with no arguments
meroctl call list_all --context <context-id> --args '{}'

# Interactive shell (one persistent WebSocket)
meroctl call -i --context <context-id>
```

---

## context identity — manage a context's identities

Identity management lives **under `context`** (there is no top-level `meroctl identity`):

```bash
# Generate a new identity (Ed25519 keypair) in a context
meroctl context identity generate --context <context-id>

# Grant / revoke a capability to an identity
meroctl context identity grant <context-id> <identity> <capability>
meroctl context identity revoke <context-id> <identity> <capability>

# Alias a context identity
meroctl context identity alias add <name> <identity> --context <context-id>
```

---

## namespace — application instances & multi-node trust

A namespace is the **root group** for an application instance (its own Ed25519 identity, bound to
one app). Its id doubles as a group id, so you pass it as `--group-id` when creating contexts.

```bash
# Create a namespace bound to an app (--application-id is required) — this node is the trust root
meroctl namespace create --application-id <application-id>
# → namespace-id

# List namespaces on this node (root groups / application instances)
meroctl namespace list                 # alias: meroctl namespace ls

# List the groups directly under a namespace
meroctl namespace groups <namespace-id>

# Create a child group (subgroup) inside a namespace
meroctl namespace create-group <namespace-id> --alias <name>
# → group-id

# Generate an invite token (share with the joining node)
meroctl namespace invite <namespace-id>

# Join a namespace using an invite token
meroctl namespace join <namespace-id> '<invitation-json>'
```

---

## group — context membership

```bash
# List groups
meroctl group list

# Join a context via group membership (after joining the namespace)
meroctl group join-context <context-id>
```

> `meroctl group create` is **deprecated** — create namespaces with `meroctl namespace create` and
> subgroups with `meroctl namespace create-group`.

---

## Full local dev flow (single machine)

```bash
# 1. Start the node (in another terminal). Defaults: server/API 2528, swarm 2428.
merod --node node1 init --server-port 2528 --swarm-port 2428
merod --node node1 run

# 2. Register the node
meroctl node add node1 ~/.calimero/node1
meroctl node use node1

# 3. Install app
meroctl app install --path target/wasm32-unknown-unknown/release/myapp.wasm
# → save application-id

# 4. Create a namespace (root group) for the app
meroctl namespace create --application-id <application-id>
# → save namespace-id

# 5. Create context — --group-id is required (use the namespace-id)
meroctl context create --application-id <application-id> --group-id <namespace-id>
# → save context-id

# 6. Develop interactively (method positional, --context flag, no --view)
meroctl call set --context <context-id> --args '{"key":"foo","value":"bar"}'
meroctl call get --context <context-id> --args '{"key":"foo"}'
```
