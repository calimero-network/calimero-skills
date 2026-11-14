# Scripting and CI with meroctl

Every answer is JSON on stdout (streams such as `context watch` print JSON lines), so parse it with
`jq`. There is no `--output-format` flag.

## Capturing ids

```bash
ORG=$(meroctl namespace create Acme | jq -r .orgId)
APP=$(meroctl context create --name kv --package com.example.kv --namespace "$ORG" | jq -r .appId)
meroctl call -c "$APP" set --args '{"key":"hello","value":"world"}'
meroctl call -c "$APP" get --args '{"key":"hello"}' --view | jq -r .result
```

An alias saves the capture: `context create ... --alias kv`, then `meroctl call -c kv ...`.

## Calling in a loop

```bash
for key in foo bar baz; do
  meroctl call -c kv set --args "$(jq -nc --arg k "$key" '{key: $k, value: ($k + "-val")}')" \
    --idempotency-key "seed-$key"
done
```

`--idempotency-key` makes a retried call answer once.

## CI against a development cluster

```yaml
- name: Scenario and smoke test
  run: |
    curl -fsSL https://raw.githubusercontent.com/calimero-network/core/master/scripts/install.sh \
      | sh -s -- merod meroctl --version 1.0.0-rc.24
    meroctl local test apps/kv-store
    meroctl local up
    meroctl login --dev-passkey ./ci-passkey.json --name ci
    meroctl app build apps/kv-store --out kv.wasm
    meroctl context create --name kv --path kv.wasm --alias kv
    meroctl call -c kv set --args '{"key":"t","value":"1"}'
    test "$(meroctl call -c kv get --args '{"key":"t"}' --view | jq -r .result)" = 1
    meroctl local down
```

## CI against a real cluster

Publish the release to the cluster's registry first (`meroctl app pack --key`,
`meroctl app publish`; see `calimero-registry`). Then upgrade with an upgrade key the owner made
once with a passkey (`meroctl account api-key create --label ci --upgrades kv --ttl-secs 7776000`,
printed as `{ keyId, key }`), and the image profiles you trust:

```yaml
- name: Upgrade the app
  env:
    CALIMERO_API: https://node.example.com
    CALIMERO_API_KEY: ${{ secrets.CALIMERO_UPGRADE_KEY }}
    CALIMERO_TEE_PROFILES: ${{ vars.CALIMERO_TEE_PROFILES }}
  run: |
    meroctl context update <app-id> --version ${{ github.ref_name }}
```

The node installs the release from its registry if it lacks it, then upgrades. The key only moves
that one context to signed releases of its package; every other request with it, reads included, is
refused `403 UPGRADE_KEY_ONLY`. For other automation, use an ordinary key
(`account api-key create --context C --read-only`, or one made in the console).

## Any route: raw and proxy

```bash
meroctl raw get /auth/me
meroctl raw post /auth/apikeys '{"label":"ci","methods":["get"],"readOnly":true}' --dev-passkey ./dev-passkey.json

meroctl proxy &                       # { "listening": "http://127.0.0.1:2580", "node": ... }
curl -s http://127.0.0.1:2580/auth/me
```

`raw` and `proxy` send through the same attested, sealed client as every command. `proxy` binds to
loopback, refuses requests a browser sends for a page, and never logs headers, queries or bodies.

## Several nodes or clusters

`--node` picks a saved node per command:

```bash
meroctl --node staging call -c kv get --args '{"key":"a"}' --view
meroctl --node prod --tee-profiles <profile> call -c kv get --args '{"key":"a"}' --view
```

Any node of a cluster serves every app; there is no per-node join or sync step.
