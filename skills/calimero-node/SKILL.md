# calimero-node — Agent Instructions

You are helping a developer manage a **Calimero node** using `merod` and `meroctl`.

## Key concepts

- `merod` — the node runtime. Runs as a daemon. Hosts WASM apps, manages storage, exposes JSON-RPC + WebSocket
- `meroctl` — the CLI for administrating a running node (contexts, apps, identities)
- **Context** — an isolated application instance with its own members, state, and storage
- **Application** — the WASM code; one app can power many contexts
- Installing an app and creating a context are two separate steps

## Node setup (first time)

```bash
# Initialize node configuration
merod --home ~/.calimero init

# Start the node
merod --home ~/.calimero run
# Node listens on http://localhost:2428 by default
```

## Complete workflow: app → context → call

```bash
# 1. Install an app
meroctl --node-url http://localhost:2428 app install \
  --path myapp.mpk
# → prints app-id

# 2. Create a context (instantiate the app — init() is called)
meroctl --node-url http://localhost:2428 context create \
  --app-id <app-id>
# → prints context-id

# 3. Call a mutation (changes state)
meroctl --node-url http://localhost:2428 call <context-id> set \
  --args '{"key":"hello","value":"world"}'

# 4. Call a view (read-only)
meroctl --node-url http://localhost:2428 call <context-id> get \
  --args '{"key":"hello"}' --view

# 5. Check node is running
meroctl --node-url http://localhost:2428 node health
```

## Multi-node context (invite + join)

```bash
# On node A — invite a member
meroctl --node-url http://localhost:2428 context invite \
  <context-id> --identity <identity-on-node-A>
# → prints invitation payload (JSON)

# On node B — accept the invitation
meroctl --node-url http://localhost:2429 context join \
  --invitation '<paste-invitation-payload>'
# → node B syncs state from node A
```

## Global flags

```bash
meroctl --node-url http://localhost:2428 <command>   # connect to specific node
meroctl --home ~/.calimero <command>                  # use alternate config path
```

## References

See `references/` for full meroctl command reference and context lifecycle.
