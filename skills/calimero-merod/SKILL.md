---
name: calimero-merod
description:
  'The merod binary, the Calimero 1.0 node: init, config, run, every flag and MEROD_* variable,
  merod local, inspect, kms, attest, health and metrics. Use when starting, configuring or deploying
  merod.'
---

# calimero-merod — Agent Instructions

You are helping a developer or operator run **`merod`**, the Calimero 1.0 node. One process is one
node of a cluster: it serves the node API on one HTTP listener, keeps its state sealed under a data
directory, and hosts the system group and the app instances placed on it.

This skill teaches core 1.0's merod (1.0.0-rc.30). 0.x's merod (a peer-to-peer node on a swarm port,
`init --server-port`/`--swarm-port`/`--auth-mode`/`--mock-tee`, JSON-RPC and WebSocket APIs, JWT
auth) is gone. For running a development cluster, prefer `meroctl local up` (`calimero-meroctl`);
for operating a cluster, `meroctl ops` (`calimero-node`).

## Commands

```text
merod [--home DIR] [--node NAME] <COMMAND>

  init     Write the node's configuration ({home}/{NAME}/config.toml)
  run      Start the node; flags given here override the file for this run
  config   Change the node's configuration (the flags given), then print it
  local    A development cluster in this process
  inspect  What a stopped node's data directory holds (v1's merodb)
  kms      disk-key: the data-disk key from mero-kms (for a TEE boot script)
  attest   A release attestation, made without any KMS key
```

`--home` (`CALIMERO_HOME`, default `~/.calimero`) and `--node NAME` (`MEROD_NODE_NAME`) choose the
configuration `{home}/{NAME}/config.toml` and data `{home}/{NAME}/data`. `init`, `config` and
`inspect` (without `--data-dir`) need `--node`; `run` does not.

## A development node

```bash
merod local                               # 3 nodes on 127.0.0.1:2501-2503, mock attestation, until Ctrl-C
merod local --nodes 1 --dir ./cluster --fresh

# one node of its own, reachable from other machines
merod --node dev init --dev --node-id 1 --public-url http://127.0.0.1:2528/ \
  --peers 1=http://127.0.0.1:2528/ --bootstrap --ops-token devtoken
merod --node dev run
```

`meroctl local up` runs `merod local` (one node by default, from the release's Docker image) in the
background and saves it as the meroctl node `local`.

## A production node (TDX)

```bash
merod --node n1 init --node-id 1 --public-url https://n1.eu1.example.com/ --cluster eu1 \
  --peers 1=https://n1.eu1.example.com/,2=https://n2.eu1.example.com/,3=https://n3.eu1.example.com/ \
  --kms-url https://kms.internal.example.com/ --kms-identity /data/disk-identity \
  --rp-id example.com --origins https://app.example.com --apps-domain apps.example.com \
  --ops-token-sha256 "$OPS_TOKEN_SHA256" --operator-key "$OPERATOR_PUBLIC_HEX" \
  --backup-dir /backups --recovery-dir /recovery --registry-url https://registry.example.com/
merod --node n1 run --bootstrap        # on exactly one founding node's first start
merod --node n2 run                    # the others
```

The image sets `MERO_TEE_VERSION` and `MERO_TEE_PROFILE`; a TDX node refuses to start without them.
In TDX mode the storage key comes only from mero-kms (`--kms-url` with `--kms-identity`, the same
identity file and `--cluster` on every node).

## Key facts

- **One struct is the flags, the file and the environment**: every node flag is a kebab-case key of
  `config.toml` and a `MEROD_*` variable (`MERO_TEE_*` for the two TEE keys). Precedence for `run`:
  flag, then variable, then file, then default. Unknown keys are refused; defaults are never
  written. A container can `run` with variables only, no `init`.
- **Required**: `--node-id` and `--public-url` (and a data directory). `--listen` defaults to
  `0.0.0.0:2528`; `--public-url` must be the URL peers and clients use to reach that node.
- **`--dev`** means mock quotes, a development storage key, plain requests and raw WASM or `.mpk`
  uploads. Never in production; `--storage-key`, `--storage-key-file` and `--allow-unsigned-bundles`
  belong only with it.
- **Governance flags are fixed at genesis** (`--release-approvals`, `--app-upgrades`,
  `--outbound-approvals`, `--deployments`, `--deployers`, `--sign-up`, and `--operator-key`): give
  every founding node the same values; changing them later changes nothing.
- **Passkeys**: `--rp-id` must be a registrable suffix of every `--origins` host and
  `--apps-domain`, or merod refuses to start.
- **Only `/health` and `/attestation` answer in the clear**; every other route is sealed. merod
  serves plain HTTP: put HTTPS in front (passkeys need a secure context), and turn off buffering for
  `/apps/{app}/events`.
- **A new release is a new node**: a node does not move to a new mero-tee image in place (its new
  storage key does not open its disk); see `calimero-node`.

## References

- `references/node-flags.md`: every node flag with its variable and default.
- `references/local-inspect-kms-attest.md`: `local`, `inspect`, `kms disk-key`, `attest`, job nodes,
  Docker.
- `references/health-and-metrics.md`: `/health`, `/attestation`, metrics and logs.

## Rules

- `rules/dev-is-not-production.md`: `--dev` and development keys only on development nodes.
- `rules/governance-is-fixed-at-genesis.md`: the same governance flags and operator key on every
  founding node.
