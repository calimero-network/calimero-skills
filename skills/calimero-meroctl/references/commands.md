# meroctl Command Reference (core 1.0)

Every command and flag here is in core's meroctl reference (`docs/.../operate/meroctl.mdx`); run
`meroctl <command> --help` to check against your build. Output is JSON. `CONTEXT` is an alias of the
signed-in account or an app id; `ORG` an organization id; `TEAM` a team id.

## Global arguments

| Flag                       | Environment                  | Meaning                                                       |
| -------------------------- | ---------------------------- | ------------------------------------------------------------- |
| `--home PATH`              | `CALIMERO_HOME`              | meroctl's saved nodes and sessions (default `~/.calimero`)    |
| `--api URL`                | `CALIMERO_API`               | the node's URL (any node of the cluster)                      |
| `--node ALIAS`             |                              | a saved node, or a URL; conflicts with `--api`                |
| `--allow-mock`             |                              | trust mock quotes (development clusters); never from the env  |
| `--allow-debug-profiles`   |                              | trust a release's debug profiles                              |
| `--tee-profiles NAME,...`  | `CALIMERO_TEE_PROFILES`      | image profiles a real node's release must list it under       |
| `--min-release VERSION`    | `CALIMERO_MIN_RELEASE`       | the oldest mero-tee release to trust (default `2.3.109`)      |
| `--api-key KEY`            | `CALIMERO_API_KEY`           | authenticate with this API key instead of a saved session     |
| `--ops-token TOKEN`        | `CALIMERO_OPS_TOKEN`         | the operator's token, for `ops`                               |
| `--operator-key-file FILE` | `CALIMERO_OPERATOR_KEY_FILE` | the operator's Ed25519 key, to sign the decisions a node asks |

## node: saved nodes (no network)

```bash
meroctl node add local http://127.0.0.1:2501 --allow-mock   # the first one saved is the default
meroctl node add prod https://node.example.com
meroctl node use prod
meroctl node list                                           # ls
meroctl node remove local                                   # rm
```

## login, logout, whoami, attest

```bash
meroctl login --dev-passkey ./dev-passkey.json --name ada   # sign up (new file) or sign in; dev clusters
meroctl login --dev-passkey ./dev-passkey.json --origin http://localhost:5173
meroctl whoami                                              # GET /auth/me
meroctl logout                                              # forget the saved session
meroctl logout --all                                        # end every session of the account first
meroctl attest                                              # the node's attestation (also `attest node`)
meroctl attest app kv                                       # every replica of the app, verified
meroctl attest release --file attestation.json --nonce <hex>   # a `merod attest` release attestation
```

## app: signed packages on a node

```bash
meroctl app install com.example.kv@1.0.0                    # from the node's registry (version required)
meroctl app install com.example.kv --version 1.0.0
meroctl app install --path ./kv.mpk                         # upload; development clusters only
meroctl app list                                            # ls
meroctl app get com.example.kv
meroctl app versions com.example.kv
meroctl app get-latest-version com.example.kv
meroctl app pipelines com.example.kv --version 1.0.0
meroctl app uninstall com.example.kv --version 1.0.0        # refused while a context runs it
meroctl app watch --path ./kv.mpk --dev-passkey ./dev-passkey.json   # push now and on every save
meroctl app origins list com.example.kv
meroctl app origins add com.example.kv https://kv.example.com --dev-passkey ./dev-passkey.json
meroctl app origins remove com.example.kv https://kv.example.com --dev-passkey ./dev-passkey.json
```

`meroctl package` is the same command. Making a package (`app new`, `build`, `codegen`, `abi`,
`signer`, `pack`, `sign`, `inspect`, `publish`) needs no node: see the `calimero-registry` and
`calimero-abi-codegen` skills.

## context: app instances

```bash
meroctl context create --name kv --path kv_store.wasm --alias kv          # installs the file first
meroctl context create --name kv --package com.example.kv --version 1.0.0 --alias kv
meroctl context create --name team-kv --package com.example.kv \
  --namespace <org-id> --group <team-id> --params '{"title":"Team notes"}'
meroctl context list                                         # ls; --package P filters
meroctl context get kv
meroctl context update kv --version 1.1.0 --dev-passkey ./dev-passkey.json
meroctl context watch kv --from 0 --limit 10                 # committed events, then live; ws
meroctl context alias add notes <app-id>
meroctl context alias list
meroctl context use kv                                       # the alias `default`
meroctl context access kv team --group <team-id>             # owner|org|team|accounts|public
meroctl context access kv accounts --account <acct-1> --account <acct-2>
meroctl context metadata kv '{"color":"green"}'              # null clears it
meroctl context storage kv
meroctl context abi kv
meroctl context presence list kv
meroctl context transfer kv <account-id> --dev-passkey ./dev-passkey.json
meroctl context move kv <org-id> --bring-members --dev-passkey ./dev-passkey.json
meroctl context delete kv                                    # del
```

`context create` flags: `--name` (required), one of `--package P [--version V]`, `--bundle HASH` or
`--path FILE`, plus `--service S` (a multi-service application), `--params JSON` (`init`'s
arguments), `--namespace ORG`, `--group TEAM` (with `--namespace`), `--alias ALIAS`.
`context update` takes `--version`, `--package`, `--service`, `--bundle` (not with
`--version`/`--package`) and `--dev-passkey`; the state stays and the new code reads it.

## call

```bash
meroctl call -c kv set --args '{"key":"a","value":"1"}'      # an intent: POST /apps/{app}/intents
meroctl call -c kv get --args '{"key":"a"}' --view           # a read:    POST /apps/{app}/views
meroctl call -c kv get --args '{"key":"a"}' --view --min-index 42   # any replica past index 42
meroctl call -c kv set --args '{"key":"a","value":"2"}' --idempotency-key run-17
meroctl call -c kv rotate --dev-passkey ./dev-passkey.json   # a method that asks for confirmation
```

| Flag                    | Meaning                                                           |
| ----------------------- | ----------------------------------------------------------------- |
| `-c, --context CONTEXT` | required                                                          |
| `METHOD`                | required, positional; the ABI's camelCase name                    |
| `--args JSON`           | default `{}`                                                      |
| `--view`                | read only, answered by the leader; no write                       |
| `--min-index N`         | with `--view`: a replica that has applied index `N` may answer    |
| `--idempotency-key KEY` | retries with the same key are answered once                       |
| `--dev-passkey FILE`    | a method that needs a passkey confirmation (development clusters) |

The answer is `{ "index": n, "result": ..., "receipt": { ... } }`, the receipt signed by the
answering node. An app error is `422 APP_ERROR` with the app's code and fields.

## blob and file

```bash
meroctl blob upload ./photo.png -c kv                       # prints its id
meroctl blob list -c kv
meroctl blob info <blob-id> -c kv
meroctl blob download <blob-id> -c kv -o photo.png          # stdout without -o
meroctl blob revoke <blob-id> -c kv
meroctl blob delete <blob-id> -c kv

meroctl file upload ./report.pdf -c docs                    # a sealed file: { id, size, sha256, index }
meroctl file download docs <file-id> -o report.pdf          # plaintext, every byte checked first
```

## namespace (organizations) and group (teams)

See `orgs-and-teams.md`.

## account

```bash
meroctl account show
meroctl account usage
meroctl account device list
meroctl account device add --dev-passkey ./laptop.json --approve-with ./dev-passkey.json
meroctl account device label <credential-id> "laptop"
meroctl account device revoke <credential-id> --dev-passkey ./dev-passkey.json
meroctl account session list
meroctl account session revoke <session-id>
meroctl account activity
meroctl account api-key create --label ci --context kv --read-only --dev-passkey ./dev-passkey.json
meroctl account api-key create --upgrades kv --label deploy --dev-passkey ./dev-passkey.json
meroctl account api-key list
meroctl account api-key revoke <key-id> --dev-passkey ./dev-passkey.json
```

## cloud: Calimero Cloud (no node)

```bash
meroctl cloud login --token "$CALIMERO_CLOUD_TOKEN"         # the console's session token
meroctl cloud orgs
meroctl cloud clusters list
meroctl cloud clusters create my-cluster --size <size> --org <org> --region <region>
meroctl cloud use my-cluster                                # save its node and make it the default
meroctl cloud logout
```

`cloud compute pipeline validate|estimate|run|get|runs|watch|cancel|retry|receipt|logs|download` and
`cloud compute logs APP RUN` run and follow a context's compute pipelines (they talk to a node).

## proxy, raw, network

```bash
meroctl proxy                                       # the node's API as plain HTTP on 127.0.0.1:2580
meroctl proxy --listen 127.0.0.1:0 --openapi ./openapi.json
meroctl raw get /auth/me                            # any route, attested and sealed
meroctl raw post /auth/apikeys '{"label":"ci","methods":["get"],"readOnly":true}' --dev-passkey ./dev-passkey.json
meroctl network status                              # GET /health
```

## ops: the operator (`--ops-token`)

```bash
meroctl --ops-token "$TOKEN" ops status
meroctl --ops-token "$TOKEN" ops placement
meroctl --ops-token "$TOKEN" ops add-node <node-id> https://node-4.example.com --zone b
meroctl --ops-token "$TOKEN" ops backup
meroctl --ops-token "$TOKEN" --operator-key-file ./operator.key ops release 2.3.120
```

Also
`ops cluster|metrics|remove-node|move|restore|backup-key|recovery-keygen|recover|quotas| set-quotas|pools|set-pools|prices|set-prices|outbound|packages|install|uninstall|upgrade| upgrade-namespace`.
The Ops API has no read path into apps' data.
