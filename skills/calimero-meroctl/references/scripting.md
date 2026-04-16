# Scripting with meroctl

## Capturing output for use in scripts

Most `create` commands print an ID on stdout. Capture it with shell variable assignment:

```bash
APP_ID=$(meroctl app install --path app.wasm | grep -oP '(?<=application-id: )[\w-]+')
CTX_ID=$(meroctl context create --application-id "$APP_ID" | grep -oP '(?<=context-id: )[\w-]+')
meroctl call "$CTX_ID" set --args '{"key":"hello","value":"world"}'
```

> Check the actual output format of your `merod` version — the label text may vary.
> Use `--as-json` if available to get machine-readable output.

## JSON output (if supported)

Some `meroctl` commands support a `--as-json` flag for machine-readable output:

```bash
meroctl --as-json context ls
meroctl --as-json app ls
```

## Minimal CI script (GitHub Actions)

```yaml
- name: Deploy and test
  run: |
    # Register node (assumes merod is running in a service container)
    meroctl node add ci http://localhost:2428
    meroctl node use ci

    # Install app
    APP_ID=$(meroctl app install --path app.wasm)
    echo "APP_ID=$APP_ID" >> $GITHUB_ENV

    # Create context
    CTX_ID=$(meroctl context create --application-id "$APP_ID")
    echo "CTX_ID=$CTX_ID" >> $GITHUB_ENV

- name: Run integration tests
  run: |
    meroctl call "$CTX_ID" set --args '{"key":"test","value":"1"}'
    RESULT=$(meroctl call "$CTX_ID" get --args '{"key":"test"}' --view)
    echo "$RESULT" | grep -q '"1"' || (echo "FAIL: unexpected value" && exit 1)
```

## Dev-mode hot reload

Use `--watch` during development to automatically reinstall the WASM and update the
context whenever the file changes:

```bash
# Watches app.wasm, reinstalls on change
meroctl context create --watch path/to/app.wasm
```

## Calling methods in a loop

```bash
for key in foo bar baz; do
  meroctl call "$CTX_ID" set --args "{\"key\":\"$key\",\"value\":\"$key-val\"}"
done
```

## Multi-node scripting

```bash
# Node A: setup
meroctl --node node1 namespace create
NS_ID=<paste namespace-id>
meroctl --node node1 context create --application-id "$APP_ID"
CTX_ID=<paste context-id>
INVITE=$(meroctl --node node1 namespace invite "$NS_ID")

# Node B: join
meroctl --node node2 namespace join "$NS_ID" "$INVITE"
meroctl --node node2 group join-context "$CTX_ID"
```
