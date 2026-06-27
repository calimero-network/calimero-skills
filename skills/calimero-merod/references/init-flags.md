# merod Init and Run Flags

## merod init

Initialises a new node home directory: generates key material, writes the config file, and creates
the storage directory. Run **once** per node, before the first `merod run`.

```bash
merod --node <name> init [flags]
```

### Flags

`--node` (`-n`) and `--home` are **root** flags and must appear before the `init` subcommand;
the remaining flags belong to `init`.

| Flag                   | Required | Default       | Description                                                              |
| ---------------------- | -------- | ------------- | ----------------------------------------------------------------------- |
| `--node <name>` / `-n` | Yes      | —             | Root flag. Node identity name; namespaces config under `<home>/<name>/`.|
| `--home <path>`        | No       | OS config dir | Root flag. Base directory. Node data lives under `<home>/<name>/`.       |
| `--server-port <port>` | No       | `2528`        | HTTP/WS API port. Clients and meroctl connect here.                     |
| `--swarm-port <port>`  | No       | `2428`        | P2P port. Other merod nodes connect here for state sync.                |
| `--auth-mode <mode>`   | No       | `proxy`       | Auth mode for server endpoints: `proxy` or `embedded`.                  |
| `--auth-storage <s>`   | No       | `persistent`  | Embedded-auth storage: `persistent` or `memory` (only with `embedded`). |
| `--mode <mode>`        | No       | `standard`    | Node operation mode: `standard` or `read-only`.                         |
| `--force`              | No       | `false`       | Re-initialize even if the node directory already exists (destroys data). |

### Examples

```bash
# Minimal (uses defaults)
merod --node node1 init

# Custom ports
merod --node node1 init --server-port 3000 --swarm-port 3001

# Embedded auth (node issues/validates its own JWTs instead of proxying)
merod --node node1 init --auth-mode embedded

# Custom home directory (explicit ports = the defaults: server 2528, swarm 2428)
merod --home ./data --node node1 init --server-port 2528 --swarm-port 2428

# Multiple nodes on the same machine (must use different ports)
merod --home ./data --node node1 init --server-port 2528 --swarm-port 2428
merod --home ./data --node node2 init --server-port 2529 --swarm-port 2429
```

---

## merod run

Starts the node daemon. The home directory must already be initialised.

```bash
merod --node <name> run [flags]
```

### Run flags

`--node` (`-n`) and `--home` are **root** flags (before the `run` subcommand). `run` itself
accepts a couple of optional overrides.

| Flag                 | Required | Default       | Description                                                            |
| -------------------- | -------- | ------------- | --------------------------------------------------------------------- |
| `--node <name>` / `-n` | Yes    | —             | Root flag. Must match the name used during `init`.                    |
| `--home <path>`      | No       | OS config dir | Root flag. Must match the home used during `init`.                    |
| `--auth-mode <mode>` | No       | from config   | Override the auth mode in `config.toml`: `proxy` or `embedded`.        |
| `--mock-tee`         | No       | `false`       | DEV/TEST ONLY. Use mock TEE attestation quotes. Never use in production. |

### Run examples

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

```text
<home>/
└── <node-name>/
    ├── config.toml      # node configuration, incl. the [identity] section (Ed25519 keypair + peer_id)
    ├── data/            # CRDT storage (RocksDB datastore)
    └── blobs/           # blob store (application binaries, uploaded blobs)
```

**Do not edit `config.toml` manually unless you know what you are changing.** Port numbers are
written to config during `init` and cannot be changed without re-initialising or manually editing
the config.
