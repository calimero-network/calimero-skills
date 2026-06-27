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

## Core workflow: app → namespace → context → call

A context is always bound to a **group**, and a namespace **is** the root group — so you create a
namespace first and pass its id as `--group-id`. `meroctl context create` **requires** `--group-id`.

```bash
# 1. Install app (--package/--version are optional metadata)
meroctl app install --path myapp.mpk
# → prints application-id

# 2. Create a namespace for the app (the namespace IS the root group)
meroctl namespace create --application-id <application-id>
# → prints namespace-id  (also usable directly as a group id)

# 3. Create context (calls init()) — bound to the namespace's root group
meroctl context create --application-id <application-id> --group-id <namespace-id>
# → prints context-id

# 4. Call a method — METHOD is positional, the context is the --context flag.
#    A "view" is simply a read-only method; there is NO --view flag.
meroctl call set --context <context-id> --args '{"key":"hello","value":"world"}'

# 5. Call a view method (a view is just a read-only method — same call form)
meroctl call get --context <context-id> --args '{"key":"hello"}'
```

See `references/` (multi-node setup) for invitations, subgroups, and joining contexts.

## Global flags

| Flag                    | Purpose                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `--node <name>`         | Use a registered node by name                                   |
| `--api <url>`           | Connect to a node directly by URL (skips registration)          |
| `--home <path>`         | Alternate meroctl config directory (default: system config dir) |
| `--output-format <fmt>` | Output format — `json` for machine-readable / scripting         |

## Key rules

- `app install`, `namespace create`, and `context create` are separate steps. `context create`
  **requires `--group-id`** — pass the `namespace-id` from `namespace create` (the namespace is the
  root group), or a subgroup id from `namespace create-group`.
- `meroctl call` takes the **method name positionally** and the context via `--context` (or `-c`);
  there is **no `--view` flag** — a view is just a read-only method. `call` has no `--as` flag (the
  call flags are `--args`, `--id`, `--substitute`, `-i`/`--interactive`, `--timeout`); `--as` is for
  identity-aliasing subcommands like `context create`/`identity`, not `call`.
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
