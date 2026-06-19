# Rule: Always Init Before Run

**`merod init` must be run once before `merod run` on any new home directory.**

## Correct order

```bash
# 1. Init (ONCE — creates config, keypair, storage dirs).
#    Defaults: server/API 2528, swarm 2428.
merod --node node1 init --server-port 2528 --swarm-port 2428

# 2. Run (every time after)
merod --node node1 run
```

## What goes wrong without init

Running `merod run` on an uninitialised home fails immediately — the node has no config file, no
keypair, and no storage directory. The error will be something like `config not found` or
`identity not found`.

## Re-initialising loses all data

Running `merod init` on a home that already has data will **overwrite the config and generate a new
keypair**, effectively destroying the node's identity and making all existing contexts unreachable
(their members' trust roots refer to the old keypair).

**Never re-init a production node home.**

## Multiple nodes on one machine

Each node needs its own `--node` name and different ports:

```bash
merod --home ./data --node node1 init --server-port 2528 --swarm-port 2428
merod --home ./data --node node2 init --server-port 2529 --swarm-port 2429

# Run both (separate terminals or background)
merod --home ./data --node node1 run &
merod --home ./data --node node2 run &
```
