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
# Create a context (instantiates app — calls init())
meroctl context create --application-id <application-id>

# Create in dev mode (auto-reinstall when WASM file changes)
meroctl context create --watch path/to/app.wasm

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
`--view` flag** — calling a read-only method just reads. Use `--as <identity>` to call as a specific
identity, and `-i`/`--interactive` to open a persistent WebSocket shell for many calls.

```bash
# Mutation — changes shared CRDT state
meroctl call <method-name> --context <context-id> --args '{"key":"val"}'

# View / read-only method (same form; optionally as a specific identity)
meroctl call <method-name> --context <context-id> --args '{"key":"val"}' --as <identity-pubkey>

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

## namespace — multi-node trust

```bash
# Create a namespace (this node is the trust root)
meroctl namespace create

# List namespaces on this node
meroctl namespace ls

# Generate an invite token (share with the joining node)
meroctl namespace invite <namespace-id>

# Join a namespace using an invite token
meroctl namespace join <namespace-id> '<invitation-json>'
```

---

## group — context membership

```bash
# List groups
meroctl group ls

# Join a context via group membership (after joining the namespace)
meroctl group join-context <context-id>
```

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

# 4. Create context
meroctl context create --application-id <application-id>
# → save context-id

# 5. Develop interactively (method positional, --context flag, no --view)
meroctl call set --context <context-id> --args '{"key":"foo","value":"bar"}'
meroctl call get --context <context-id> --args '{"key":"foo"}'
```
