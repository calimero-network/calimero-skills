# Scripting with meroctl

## Capturing output for use in scripts

Most `create` commands print an ID on stdout. Capture it with shell variable assignment:

```bash
APP_ID=$(meroctl app install --path app.wasm | grep -oP '(?<=application-id: )[\w-]+')
# A namespace (root group) is required before a context — capture its id for --group-id.
NS_ID=$(meroctl namespace create --application-id "$APP_ID" | grep -oP '(?<=namespace-id: )[\w-]+')
CTX_ID=$(meroctl context create --application-id "$APP_ID" --group-id "$NS_ID" | grep -oP '(?<=context-id: )[\w-]+')
meroctl call set --context "$CTX_ID" --args '{"key":"hello","value":"world"}'
```

> The label text in human output may vary across versions, so for robust scripting prefer
> `--output-format json` piped to `jq` (e.g.
> `meroctl --output-format json app install --path app.wasm | jq -r '.id'`) — confirm the exact
> field name against your version's JSON output. The `grep` form above is the simple fallback.
> Either way, **parse** the output; don't assign the whole command output to the ID variable.

## JSON output

Use the global `--output-format json` flag for machine-readable output:

```bash
meroctl --output-format json context ls
meroctl --output-format json app ls
```

## Minimal CI script (GitHub Actions)

```yaml
- name: Deploy and test
  run: |
    # Register node (assumes merod is running in a service container).
    # The node's HTTP/API port is 2528 by default (swarm uses 2428).
    meroctl node add ci http://localhost:2528
    meroctl node use ci

    # Install app — PARSE the id out of the output (label may vary; or use
    # `--output-format json | jq -r '.id'` once you confirm the field name).
    APP_ID=$(meroctl app install --path app.wasm | grep -oP '(?<=application-id: )[\w-]+')
    echo "APP_ID=$APP_ID" >> $GITHUB_ENV

    # Create a namespace (root group) — required to get a --group-id for the context
    NS_ID=$(meroctl namespace create --application-id "$APP_ID" | grep -oP '(?<=namespace-id: )[\w-]+')
    echo "NS_ID=$NS_ID" >> $GITHUB_ENV

    # Create context (--group-id required)
    CTX_ID=$(meroctl context create --application-id "$APP_ID" --group-id "$NS_ID" | grep -oP '(?<=context-id: )[\w-]+')
    echo "CTX_ID=$CTX_ID" >> $GITHUB_ENV

- name: Run integration tests
  run: |
    meroctl call set --context "$CTX_ID" --args '{"key":"test","value":"1"}'
    RESULT=$(meroctl call get --context "$CTX_ID" --args '{"key":"test"}')
    echo "$RESULT" | grep -q '"1"' || (echo "FAIL: unexpected value" && exit 1)
```

## Dev-mode hot reload

Use `--watch` during development to automatically reinstall the WASM and update the context whenever
the file changes:

```bash
# Watches app.wasm, reinstalls on change (--group-id still required)
meroctl context create --watch path/to/app.wasm --group-id "$NS_ID"
```

## Calling methods in a loop

```bash
for key in foo bar baz; do
  meroctl call set --context "$CTX_ID" --args "{\"key\":\"$key\",\"value\":\"$key-val\"}"
done
```

## Multi-node scripting

```bash
# Node A: setup
meroctl --node node1 namespace create --application-id "$APP_ID"
NS_ID=<paste namespace-id>
meroctl --node node1 context create --application-id "$APP_ID" --group-id "$NS_ID"
CTX_ID=<paste context-id>
INVITE=$(meroctl --node node1 namespace invite "$NS_ID")

# Node B: join
meroctl --node node2 namespace join "$NS_ID" "$INVITE"
meroctl --node node2 group join-context "$CTX_ID"
```
