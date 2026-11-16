# merod Node Flags (init, run, config)

Checked against `merod run --help` of 1.0.0-rc.30 and core's `operate/merod.mdx`. `init`, `run` and
`config` take the same flags; each is also a `config.toml` key (the flag without `--`) and an
environment variable. A boolean takes an optional value: `--dev` is `--dev true`, and `--dev false`
turns off a `dev = true` the file holds. A list flag replaces the whole list.

## Identity and network

| Flag                 | Environment        | Default              | Meaning                                                   |
| -------------------- | ------------------ | -------------------- | --------------------------------------------------------- |
| `--node-id N`        | `MEROD_NODE_ID`    | required             | this node's id in the cluster (a `u64`)                   |
| `--listen ADDR`      | `MEROD_LISTEN`     | `0.0.0.0:2528`       | the API's socket address                                  |
| `--public-url URL`   | `MEROD_PUBLIC_URL` | required             | the URL peers and clients use for this node               |
| `--data-dir DIR`     | `MEROD_DATA_DIR`   | `{home}/{node}/data` | where the node keeps its state                            |
| `--peers ID=URL,...` | `MEROD_PEERS`      | none                 | the founding members, this node included                  |
| `--bootstrap [BOOL]` | `MEROD_BOOTSTRAP`  | `false`              | form the system group with `--peers` as voters (one node) |
| `--cluster NAME`     | `MEROD_CLUSTER`    | `dev`                | the cluster's name; the same on every node                |
| `--replicas N`       | `MEROD_REPLICAS`   | `3`                  | how many nodes hold each new app instance                 |

A node starting on an empty data directory without `--bootstrap` waits (serving only `/health`,
`/attestation` and the key delivery) until a peer delivers the cluster key to its registered
address, for up to 10 minutes.

## Trust and keys

| Flag                         | Environment               | Default         | Meaning                                                                         |
| ---------------------------- | ------------------------- | --------------- | ------------------------------------------------------------------------------- |
| `--dev [BOOL]`               | `MEROD_DEV`               | `false`         | mock quotes, a development storage key, plain requests, uploads                 |
| `--storage-key HEX`          | `MEROD_STORAGE_KEY`       | none            | a 32-byte storage key; `--dev` only                                             |
| `--storage-key-file FILE`    | `MEROD_STORAGE_KEY_FILE`  | none            | key material the storage key derives from; `--dev` only                         |
| `--kms-url URL`              | `MEROD_KMS_URL`           | none            | fetch the storage key from mero-kms (needs `--kms-identity`); TDX's only source |
| `--kms-identity FILE`        | `MEROD_KMS_IDENTITY`      | none            | the cluster's disk identity (a libp2p keypair); the same file on every node     |
| `--kms-disk-evidence FILE`   | `MEROD_KMS_DISK_EVIDENCE` | none            | `kms disk-key --evidence-out`'s record, reported in the attestation             |
| `--tee-release VERSION`      | `MERO_TEE_VERSION`        | none            | the mero-tee release this image is; required in TDX mode                        |
| `--tee-profile NAME`         | `MERO_TEE_PROFILE`        | none            | the image profile this node runs                                                |
| `--peer-profiles NAME,...`   | `MEROD_PEER_PROFILES`     | `--tee-profile` | profiles a peer's quote may match                                               |
| `--peer-min-release VERSION` | `MEROD_PEER_MIN_RELEASE`  | `2.3.109`       | the oldest mero-tee release a peer may run                                      |

`run` also takes `--accept-rollback` (this run only, never stored): start on a store mero-kms's
rollback counter says is older than this node has run, when the newest disks are lost.

## Operator and observability

| Flag                     | Environment              | Default | Meaning                                                                         |
| ------------------------ | ------------------------ | ------- | ------------------------------------------------------------------------------- |
| `--ops-token TOKEN`      | `MEROD_OPS_TOKEN`        | none    | the Ops API bearer token (without it or its hash, `/ops/*` answers `403`)       |
| `--ops-token-sha256 HEX` | `MEROD_OPS_TOKEN_SHA256` | none    | the token's SHA-256 instead, so the machine holds nothing usable                |
| `--operator-key HEX`     | `MEROD_OPERATOR_KEY`     | none    | the operator's Ed25519 **public** key; recorded at genesis                      |
| `--metrics-listen ADDR`  | `MEROD_METRICS_LISTEN`   | off     | plain HTTP serving only `GET /metrics`; bind it to a private address            |
| `--backup-dir DIR`       | `MEROD_BACKUP_DIR`       | none    | sealed snapshots every 60 s (only a node of this cluster opens them)            |
| `--recovery-dir DIR`     | `MEROD_RECOVERY_DIR`     | none    | backups sealed to each app's backup holder's key, every 5 minutes               |
| `--restore-from DIR`     | `MEROD_RESTORE_FROM`     | none    | with `--bootstrap` on an empty data dir: found the cluster again from backups   |
| `--recover-from DIR`     | `MEROD_RECOVER_FROM`     | none    | with `--bootstrap`: found it again from a recovery disk (`meroctl ops recover`) |

## Governance (fixed at genesis, attested)

| Flag                                   | Environment                | Default    |
| -------------------------------------- | -------------------------- | ---------- |
| `--release-approvals owner\|operator`  | `MEROD_RELEASE_APPROVALS`  | `owner`    |
| `--app-upgrades owner\|operator`       | `MEROD_APP_UPGRADES`       | `owner`    |
| `--outbound-approvals owner\|operator` | `MEROD_OUTBOUND_APPROVALS` | `owner`    |
| `--deployments open\|granted`          | `MEROD_DEPLOYMENTS`        | `open`     |
| `--deployers operator\|owner`          | `MEROD_DEPLOYERS`          | `operator` |
| `--sign-up open\|invite\|closed`       | `MEROD_SIGN_UP`            | `open`     |

Later changes: the operator's signed move of deployments from `open` to `granted` (never back), and
a signed sign-up policy change. Nothing else.

## Apps, passkeys and frontends

| Flag                              | Environment                      | Default                   | Meaning                                                            |
| --------------------------------- | -------------------------------- | ------------------------- | ------------------------------------------------------------------ |
| `--registry-url URL`              | `MEROD_REGISTRY_URL`             | none                      | where nodes fetch signed releases (`PACKAGE@VERSION` installs)     |
| `--allow-unsigned-bundles [BOOL]` | `MEROD_ALLOW_UNSIGNED_BUNDLES`   | `false` (on with `--dev`) | accept raw WASM uploads and dev-key-signed releases                |
| `--rp-id ID`                      | `MEROD_RP_ID`                    | `localhost`               | the passkey relying party id; a suffix of every origin's host      |
| `--origins URL,...`               | `MEROD_ORIGINS`                  | `http://localhost:3000`   | origins that may run passkey ceremonies and call the API (CORS)    |
| `--apps-domain DOMAIN`            | `MEROD_APPS_DOMAIN`              | none                      | serve each package's frontend at `{label}.{DOMAIN}` (wildcard DNS) |
| `--attestation-verifier-url URL`  | `MEROD_ATTESTATION_VERIFIER_URL` | none                      | the independent verifier the consent page links to                 |
| `--settings FILE`                 | `MEROD_SETTINGS`                 | none                      | a TOML file whose `[outbound]` table replaces the configuration's  |

## Job nodes

| Flag                     | Environment              | Default | Meaning                                                                        |
| ------------------------ | ------------------------ | ------- | ------------------------------------------------------------------------------ |
| `--job-node [BOOL]`      | `MEROD_JOB_NODE`         | `false` | run compute only: no app, store, vote or cluster key                           |
| `--cluster-identity HEX` | `MEROD_CLUSTER_IDENTITY` | none    | required with `--job-node`: the cluster's identity key (`meroctl ops cluster`) |
| `--job-slots N`          | `MEROD_JOB_SLOTS`        | `2`     | compute runs taken at once                                                     |

## When run refuses to start

- `--node-id` or `--public-url` missing, or no data directory; a `--peers` entry not `id=url`;
- only one of `--kms-url` and `--kms-identity`;
- TDX mode (no `--dev`) with `--storage-key`/`--storage-key-file`, or no storage-key source;
- TDX mode without `MERO_TEE_VERSION`, or without both `MERO_TEE_PROFILE` and `--peer-profiles`;
- `--rp-id` not a suffix of an `--origins` host or of `--apps-domain`;
- a store mero-kms's rollback counter calls older than this node has run (see `--accept-rollback`).
