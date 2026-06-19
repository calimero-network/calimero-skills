# calimero-meroctl — Agent Instructions

You are helping a developer use **`meroctl`** — the Calimero CLI for administering a running `merod`
node (apps, contexts, identities, calls, namespaces, groups).

## What meroctl is

`meroctl` is a standalone CLI that connects to a running `merod` node over HTTP. It does **not**
start or stop the node — use `merod` for that. `meroctl` is for everything you would do after the
node is running.

## Connecting to a node

```bash
# Register a local node once (recommended)
meroctl node add node1 /path/to/calimero/home
meroctl node use node1           # set as default

# Or use a remote node
meroctl node add prod http://my-node.example.com
meroctl node use prod

# Or pass URL directly on any command (no registration needed)
meroctl --api http://localhost:2528 context ls
```

> The node's HTTP/JSON-RPC API listens on **2528** by default (the P2P swarm uses 2428).

Once a node is registered and set as active, you can omit `--node` from every command.

## Core workflow: app → context → call

```bash
# 1. Install app (--package/--version are optional metadata)
meroctl app install --path myapp.wasm
# → prints application-id

# 2. Create context (calls init())
meroctl context create --application-id <application-id>
# → prints context-id

# 3. Call a method — METHOD is positional, the context is the --context flag.
#    A "view" is simply a read-only method; there is NO --view flag.
meroctl call set --context <context-id> --args '{"key":"hello","value":"world"}'

# 4. Call a view method (optionally as a specific identity with --as)
meroctl call get --context <context-id> --args '{"key":"hello"}'
```

## Global flags

| Flag                    | Purpose                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `--node <name>`         | Use a registered node by name                                   |
| `--api <url>`           | Connect to a node directly by URL (skips registration)          |
| `--home <path>`         | Alternate meroctl config directory (default: system config dir) |
| `--output-format <fmt>` | Output format — `json` for machine-readable / scripting         |

## Key rules

- `app install` and `context create` are always two separate steps.
- `meroctl call` takes the **method name positionally** and the context via `--context` (or `-c`);
  there is **no `--view` flag** — a view is just a read-only method. Use `--as <identity>` to call
  as a specific identity, and `-i`/`--interactive` for a persistent WebSocket shell.
- Identity management is **under `context`** (`meroctl context identity …`) — there is no top-level
  `meroctl identity` command.
- Uninstall apps with `meroctl app uninstall <app-id>` (not `app remove`).
- Register a node with `meroctl node add` + `meroctl node use` once; after that no `--node` flag is
  needed.

## References

See `references/` for:

- Full command reference for all subcommand groups
- Scripting patterns for CI and automation
- Multi-node setup with namespaces and groups
