# Rule: Save a Node Once, Then Use It by Name

**Run `meroctl node add` once (or let `local up` / `cloud use` save it). After that, omit
`--node`.**

## Pattern

```bash
# meroctl local up saves `local` and makes it the default when there is none
meroctl local up

# a real node: save it, make it the default
meroctl node add prod https://node.example.com
meroctl node use prod

# or a Calimero Cloud cluster
meroctl cloud use my-cluster

# every later command uses the default node
meroctl context list
meroctl call -c kv get --args '{"key":"a"}' --view
```

`node add` takes a URL (any node of the cluster), not a node's home directory. Saved nodes live in
`{home}/meroctl/nodes.json`; sessions are kept per node URL.

## Don't do this

```bash
meroctl --node prod context list
meroctl --node prod call -c kv get --args '{"key":"a"}' --view
```

## Exception: several clusters in one script

Name the node per command when a script talks to more than one cluster:

```bash
meroctl --node staging call -c kv get --args '{"key":"a"}' --view
meroctl --node prod call -c kv get --args '{"key":"a"}' --view
```
