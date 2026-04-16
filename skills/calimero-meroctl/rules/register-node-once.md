# Rule: Register Node Once, Then Use by Name

**Run `meroctl node add` + `meroctl node use` once. After that, omit `--node` from all commands.**

## Pattern

```bash
# One-time setup:
meroctl node add node1 /path/to/calimero/home   # or http://url for remote
meroctl node use node1

# All subsequent commands use the active node automatically:
meroctl app install --path app.wasm              # no --node needed
meroctl context ls                               # no --node needed
meroctl call <ctx-id> get --args '{}' --view     # no --node needed
```

## Don't do this

```bash
# Repetitive and error-prone:
meroctl --node node1 app install --path app.wasm
meroctl --node node1 context create --application-id <id>
meroctl --node node1 call <ctx-id> get --args '{}' --view
```

## Exception: multiple nodes

When scripting across multiple nodes in one session, use explicit `--node` to avoid
ambiguity:

```bash
meroctl --node node1 namespace invite <ns-id>   # Node A generates invite
meroctl --node node2 namespace join <ns-id> ... # Node B accepts
```
