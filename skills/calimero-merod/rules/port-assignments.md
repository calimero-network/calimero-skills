# Rule: Understand Port Assignments

**`merod` uses two distinct ports with different roles. Both matter.**

## Port roles

| Flag | Default | Connected by |
|---|---|---|
| `--server-port` | `2428` | `meroctl`, app clients (browser, Python, JS), all HTTP/WS API consumers |
| `--swarm-port` | `2528` | Other `merod` nodes — P2P state sync, namespace invite protocol |

## What fails when a port is wrong or blocked

| Problem | Symptom |
|---|---|
| Server port unreachable | `meroctl` cannot connect; clients get connection refused; apps cannot make API calls |
| Swarm port unreachable | Multi-node sync silently fails; namespaces cannot be joined; nodes appear isolated |

## Multiple nodes on the same machine

Each `merod` instance needs unique ports:

```bash
merod --home ./data --node node1 init --server-port 2428 --swarm-port 2528
merod --home ./data --node node2 init --server-port 2429 --swarm-port 2529
merod --home ./data --node node3 init --server-port 2430 --swarm-port 2530
```

## Ports are set at init time

Port assignments are written into the config file during `merod init`. You cannot change
them with `merod run` flags — edit `config.toml` in the node home or re-init if you
need different ports (re-init destroys the node identity, so prefer editing `config.toml`).
