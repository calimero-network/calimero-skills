# calimero-merod — Agent Instructions

You are helping a developer run and configure the **`merod` Calimero node daemon**.

## What merod is

`merod` is the Calimero node runtime. It:
- Executes WASM applications inside isolated contexts
- Manages persistent CRDT storage
- Exposes a JSON-RPC + WebSocket HTTP API (default port 2428)
- Participates in the P2P swarm for state sync with other nodes (default port 2528)
- Issues and validates JWT tokens for client authentication

`merod` is a long-running daemon. Use `meroctl` for administration after startup.

## Two-step startup

```bash
# Step 1 — initialise (run ONCE on a fresh home directory)
merod --node node1 init --server-port 2428 --swarm-port 2528

# Step 2 — run (run every time)
merod --node node1 run
```

**Never run `merod run` on an uninitialised home.** Run `init` first.

## Key flags

| Flag | Purpose | Default |
|---|---|---|
| `--node <name>` | Node identity name (used to namespace config files) | required |
| `--home <path>` | Base directory for all config and data | system config dir |
| `--server-port <port>` | HTTP/WS API port (init only) | `2428` |
| `--swarm-port <port>` | P2P swarm port (init only) | `2528` |

## Port responsibilities

| Port | What connects to it |
|---|---|
| `--server-port` (2428) | meroctl, app clients, browser frontends, Python client |
| `--swarm-port` (2528) | Other `merod` nodes (P2P state sync, namespace invite protocol) |

Both ports must be open / reachable for multi-node setups.

## References

See `references/` for init flags, config file schema, health endpoints, and Docker setup.
