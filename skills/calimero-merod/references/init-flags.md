# merod Init and Run Flags

## merod init

Initialises a new node home directory: generates key material, writes the config file, and creates
the storage directory. Run **once** per node, before the first `merod run`.

```bash
merod --node <name> init [flags]
```

### Flags

| Flag                   | Required | Default       | Description                                                         |
| ---------------------- | -------- | ------------- | ------------------------------------------------------------------- |
| `--node <name>`        | Yes      | —             | Node identity name. Namespaces config files under `<home>/<name>/`. |
| `--home <path>`        | No       | OS config dir | Base directory. All node data lives under `<home>/<name>/`.         |
| `--server-port <port>` | No       | `2428`        | HTTP/WS API port. Clients and meroctl connect here.                 |
| `--swarm-port <port>`  | No       | `2528`        | P2P port. Other merod nodes connect here for state sync.            |

### Examples

```bash
# Minimal (uses defaults)
merod --node node1 init

# Custom ports
merod --node node1 init --server-port 3000 --swarm-port 3001

# Custom home directory
merod --home ./data --node node1 init --server-port 2428 --swarm-port 2528

# Multiple nodes on the same machine (must use different ports)
merod --home ./data --node node1 init --server-port 2428 --swarm-port 2528
merod --home ./data --node node2 init --server-port 2429 --swarm-port 2529
```

---

## merod run

Starts the node daemon. The home directory must already be initialised.

```bash
merod --node <name> run [flags]
```

### Flags

| Flag            | Required | Default       | Description                             |
| --------------- | -------- | ------------- | --------------------------------------- |
| `--node <name>` | Yes      | —             | Must match the name used during `init`. |
| `--home <path>` | No       | OS config dir | Must match the home used during `init`. |

### Examples

```bash
# Run in foreground
merod --node node1 run

# Run in background (Unix)
merod --node node1 run &

# Run with custom home
merod --home ./data --node node1 run
```

---

## Data directory layout

After `init`, the following structure is created under `<home>/<node-name>/`:

```
<home>/
└── <node-name>/
    ├── config.toml      # node configuration (server port, swarm port, etc.)
    ├── identity/        # Ed25519 node keypair
    └── data/            # CRDT storage, application binaries
```

**Do not edit `config.toml` manually unless you know what you are changing.** Port numbers are
written to config during `init` and cannot be changed without re-initialising or manually editing
the config.
