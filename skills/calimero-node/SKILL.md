# calimero-node — Agent Instructions

You are helping a developer manage a **Calimero node** using `merod` and `meroctl`.

## Key concepts

- `merod` — the node runtime. Runs as a daemon. Hosts WASM apps, manages storage, exposes JSON-RPC +
  WebSocket
- `meroctl` — the CLI for administrating a running node (contexts, apps, identities)
- **Context** — an isolated application instance with its own members, state, and storage
- **Application** — the WASM code; one app can power many contexts
- Installing an app and creating a context are two separate steps

## Node setup (first time)

```bash
# Initialize node (creates key material and config)
merod --node node1 init --server-port 2428 --swarm-port 2528

# Start the node
merod --node node1 run
# Node listens on http://localhost:2428 by default
```

`--home <PATH>` is optional; defaults to the system config directory. Use it to specify a custom
data directory: `merod --home ./data --node node1 init`.

## Connecting meroctl to a node

```bash
# Register a local node by name (one-time)
meroctl node add node1 /path/to/calimero/home

# Or register a remote node
meroctl node add mynode http://node.example.com

# Set as default (so you don't need --node on every command)
meroctl node use node1

# List configured nodes
meroctl node ls
```

After setup, use `--node node1` or rely on the active node:

```bash
meroctl --node node1 context ls   # explicit
meroctl context ls                # uses active node
```

Alternatively, pass a direct URL without registering:

```bash
meroctl --api http://localhost:2428 context ls
```

## Complete workflow: app → context → call

```bash
# (Assumes: meroctl node add node1 ... && meroctl node use node1 already done)

# 1. Install an app
meroctl app install --path myapp.wasm
# → prints application-id

# 2. Create a context (instantiate the app — init() is called)
meroctl context create --application-id <application-id>
# → prints context-id

# 3. Call a mutation (changes state)
meroctl call <context-id> set --args '{"key":"hello","value":"world"}'

# 4. Call a view (read-only)
meroctl call <context-id> get --args '{"key":"hello"}' --view
```

## Related skills

- **`calimero-merod`** — deep-dive on `merod` daemon: all init flags, config file schema, health
  endpoints, Docker setup
- **`calimero-meroctl`** — complete `meroctl` CLI reference: every subcommand, every flag, scripting
  patterns, multi-node namespace/group workflow
- **`calimero-core`** — context/app/identity model, JSON-RPC protocol, WebSocket events, CRDT
  storage types

## References

See `references/` for context lifecycle detail and multi-node namespace/group setup. For the full
`meroctl` command reference, use the `calimero-meroctl` skill.
