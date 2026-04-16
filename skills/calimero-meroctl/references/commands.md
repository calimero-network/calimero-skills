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
# Install from local WASM file
meroctl app install --path path/to/app.wasm

# Install from local .mpk bundle
meroctl app install --path path/to/app.mpk

# Install from registry URL
meroctl app install --url https://apps.calimero.network/<app-id>/<version>

# List installed apps
meroctl app ls

# Get details of a specific app
meroctl app get <application-id>

# Remove an app (does not delete existing contexts)
meroctl app remove <application-id>
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

```bash
# Mutation — changes shared CRDT state
meroctl call <context-id> <method-name> --args '{"key":"val"}'

# View — read-only, skips state persistence
meroctl call <context-id> <method-name> --args '{"key":"val"}' --view

# Method with no arguments
meroctl call <context-id> list_all --args '{}' --view

# Specify executor identity explicitly
meroctl call <context-id> <method> --args '{}' --as <identity-id>
```

The `--view` flag should be used for any method that is annotated `@View()` (JS) or
takes `&self` without state mutation (Rust). Omitting `--view` on a read method is
not harmful but wastes a storage write.

---

## identity — manage identities

```bash
# Create a new identity (Ed25519 keypair)
meroctl identity create

# List all identities
meroctl identity ls

# Get details of a specific identity
meroctl identity get <identity-id>

# Delete an identity
meroctl identity delete <identity-id>
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
# 1. Start the node (in another terminal)
merod --node node1 init --server-port 2428 --swarm-port 2528
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

# 5. Develop interactively
meroctl call <context-id> set --args '{"key":"foo","value":"bar"}'
meroctl call <context-id> get --args '{"key":"foo"}' --view
```
