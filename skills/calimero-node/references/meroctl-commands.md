# meroctl Command Reference

Full CLI for managing a running Calimero node.

## Global flags

```bash
meroctl --node-url http://localhost:2428 <command>   # connect to specific node
meroctl --home ~/.calimero <command>                  # alternate config path
```

---

## Node commands

```bash
# Check node health (returns "alive" when running)
meroctl --node-url http://localhost:2428 node health
```

---

## App commands

```bash
# Install app from local bundle (.mpk or .wasm)
meroctl --node-url http://localhost:2428 app install --path myapp.mpk
meroctl --node-url http://localhost:2428 app install --path target/wasm32-unknown-unknown/release/myapp.wasm

# Install app from registry URL
meroctl --node-url http://localhost:2428 app install \
  --url https://registry.calimero.network/com.yourorg.myapp/1.0.0

# List installed apps
meroctl --node-url http://localhost:2428 app ls

# Get details of a specific app
meroctl --node-url http://localhost:2428 app get <app-id>

# Remove an app (only works if no active contexts reference it)
meroctl --node-url http://localhost:2428 app remove <app-id>
```

---

## Context commands

```bash
# Create a context (instantiates the app — calls init())
meroctl --node-url http://localhost:2428 context create --app-id <app-id>
# Returns: context-id

# List all contexts on this node
meroctl --node-url http://localhost:2428 context ls

# Get details of a specific context
meroctl --node-url http://localhost:2428 context get <context-id>

# Delete a context (wipes all state and storage for this context)
meroctl --node-url http://localhost:2428 context delete <context-id>

# List members of a context
meroctl --node-url http://localhost:2428 context members <context-id>

# Invite a member to a context (generates an invitation payload)
meroctl --node-url http://localhost:2428 context invite \
  <context-id> --identity <identity>
# Returns: invitation payload JSON — share this with the invitee

# Join a context using an invitation payload (run on the joining node)
meroctl --node-url http://localhost:2428 context join \
  --invitation '<invitation-payload-json>'
# After this, the node syncs state from the inviting node
```

### Full invite + join example

```bash
# ── Node A (inviter) ──
meroctl --node-url http://localhost:2428 context invite \
  abc123ctx --identity ed25519:AAAA...
# Prints: {"payload":"..."}

# ── Node B (joiner) ──
meroctl --node-url http://localhost:2429 context join \
  --invitation '{"payload":"..."}'
# Node B now participates in the context and syncs CRDT state
```

---

## Calling app methods

```bash
# Mutation — changes shared state (no --view flag)
meroctl --node-url http://localhost:2428 call <context-id> <method> \
  --args '{"key":"hello","value":"world"}'

# View — read-only, does NOT change state
meroctl --node-url http://localhost:2428 call <context-id> <method> \
  --args '{"key":"hello"}' --view

# Method with no arguments
meroctl --node-url http://localhost:2428 call <context-id> list_all \
  --args '{}' --view
```

---

## Identity commands

```bash
# Create a new identity (root keypair for this node)
meroctl --node-url http://localhost:2428 identity create

# List all identities on this node
meroctl --node-url http://localhost:2428 identity ls

# Get details of a specific identity
meroctl --node-url http://localhost:2428 identity get <identity>
```

---

## Step-by-step: full local development flow

```bash
# 1. Build the WASM app
cargo build --target wasm32-unknown-unknown --release

# 2. Start the node (in a separate terminal)
merod --home ~/.calimero run

# 3. Install the app
meroctl --node-url http://localhost:2428 app install \
  --path target/wasm32-unknown-unknown/release/myapp.wasm
# Copy the app-id from output

# 4. Create a context
meroctl --node-url http://localhost:2428 context create --app-id <app-id>
# Copy the context-id from output

# 5. Interact with the app
meroctl --node-url http://localhost:2428 call <context-id> set \
  --args '{"key":"foo","value":"bar"}'

meroctl --node-url http://localhost:2428 call <context-id> get \
  --args '{"key":"foo"}' --view
```

---

## Step-by-step: multi-node context sharing

```bash
# ── Node A (port 2428) ──
# Install app and create context
meroctl --node-url http://localhost:2428 app install --path myapp.mpk
meroctl --node-url http://localhost:2428 context create --app-id <app-id>
# → <context-id>

# Create identity for node B to use
meroctl --node-url http://localhost:2428 identity create
# → <identity-b>

# Generate invitation
meroctl --node-url http://localhost:2428 context invite \
  <context-id> --identity <identity-b>
# → <invitation-payload>

# ── Node B (port 2429) ──
# Accept invitation
meroctl --node-url http://localhost:2429 context join \
  --invitation '<invitation-payload>'
# Node B syncs all existing state from node A

# Both nodes can now call methods and see each other's mutations:
meroctl --node-url http://localhost:2428 call <context-id> set \
  --args '{"key":"shared","value":"data"}'
meroctl --node-url http://localhost:2429 call <context-id> get \
  --args '{"key":"shared"}' --view
# → "data"  (synced from node A)
```
