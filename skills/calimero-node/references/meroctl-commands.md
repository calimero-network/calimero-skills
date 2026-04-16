# meroctl Command Reference

Full CLI for managing a running Calimero node.

## Global flags

```bash
meroctl --node node1 <command>              # use registered node by name
meroctl --api http://localhost:2428 <command>  # connect directly by URL
meroctl --home ~/.calimero <command>        # alternate config path
```

Register a node once, then use by name:

```bash
meroctl node add node1 /path/to/home       # local node
meroctl node add mynode http://node.com    # remote node
meroctl node use node1                     # set as active (default)
```

---

## Node management commands

```bash
# Add / connect to a node
meroctl node add node1 /path/to/calimero/home
meroctl node add remote1 http://node.example.com

# Set active node
meroctl node use node1

# List configured nodes
meroctl node ls

# Remove a node connection
meroctl node remove node1

# Show node peer identity
meroctl node identity
```

---

## App commands

```bash
# Install app from local file (.wasm or .mpk)
meroctl --node node1 app install --path myapp.wasm
meroctl --node node1 app install --path myapp.mpk

# Install app from registry URL
meroctl --node node1 app install \
  --url https://apps.calimero.network/com.yourorg.myapp/1.0.0

# List installed apps
meroctl --node node1 app ls

# Get details of a specific app
meroctl --node node1 app get <application-id>

# Remove an app
meroctl --node node1 app remove <application-id>
```

---

## Context commands

```bash
# Create a context (instantiates the app — calls init())
meroctl --node node1 context create --application-id <application-id>
# Returns: context-id

# Dev mode — watch a WASM file for changes and hot-reload
meroctl --node node1 context create --watch path/to/app.wasm

# List all contexts on this node
meroctl --node node1 context ls

# Get details of a specific context
meroctl --node node1 context get <context-id>

# Delete a context (wipes all state and storage)
meroctl --node node1 context delete <context-id>

# Sync a context with peers
meroctl --node node1 context sync <context-id>
```

---

## Calling app methods

```bash
# Mutation — changes shared state
meroctl --node node1 call <context-id> set \
  --args '{"key":"hello","value":"world"}'

# View — read-only, does NOT change state
meroctl --node node1 call <context-id> get \
  --args '{"key":"hello"}' --view

# Method with no arguments
meroctl --node node1 call <context-id> list_all \
  --args '{}' --view
```

---

## Identity commands

```bash
# Create a new identity
meroctl --node node1 identity create

# List all identities
meroctl --node node1 identity ls

# Get details of a specific identity
meroctl --node node1 identity get <identity>
```

---

## Multi-node context sharing (namespace + group model)

Multi-node participation uses namespaces (root groups) and group membership.

```bash
# ── Node A: create a namespace and context ──
meroctl --node node1 namespace create
# → <namespace-id>

meroctl --node node1 context create --application-id <app-id>
# → <context-id>

# Generate an invitation for another node to join
meroctl --node node1 namespace invite <namespace-id>
# → invitation JSON payload

# ── Node B: join via invitation ──
meroctl --node node2 namespace join <namespace-id> '<invitation-json>'

# ── Node B: join the context (after joining namespace/group) ──
meroctl --node node2 group join-context <context-id>
```

---

## Step-by-step: full local development flow

```bash
# 1. Initialize and start a node
merod --node node1 init --server-port 2428 --swarm-port 2528
merod --node node1 run &  # run in background

# 2. Register the node in meroctl
meroctl node add node1 ~/.calimero/node1
meroctl node use node1

# 3. Install the app
meroctl app install --path target/wasm32-unknown-unknown/release/myapp.wasm
# → copy the application-id

# 4. Create a context
meroctl context create --application-id <application-id>
# → copy the context-id

# 5. Interact with the app
meroctl call <context-id> set --args '{"key":"foo","value":"bar"}'
meroctl call <context-id> get --args '{"key":"foo"}' --view
```
