# calimero-node — Agent Instructions

You are helping a developer manage a **Calimero node** using `merod` and `meroctl`.

## Key concepts

- `merod` — the node runtime. Runs as a daemon. Hosts WASM apps, manages storage, exposes JSON-RPC + WebSocket
- `meroctl` — the CLI for administrating a running node (contexts, apps, identities)
- **Context** — an isolated application instance with its own members, state, and storage
- **Application** — the WASM code; one app can power many contexts
- Installing an app and creating a context are two separate steps

## Quick reference

```bash
# Start a node
merod --home ~/.calimero run

# Install an app from a .mpk bundle
meroctl --node-url http://localhost:2428 app install --path myapp.mpk

# Create a context (instance of an app)
meroctl --node-url http://localhost:2428 context create --app-id <app-id>

# List contexts
meroctl --node-url http://localhost:2428 context ls

# Call a method
meroctl --node-url http://localhost:2428 call <context-id> <method> --args '{"key":"value"}'
```

## References

See `references/` for node setup, full meroctl command reference, and context lifecycle.
