# merod local, inspect, kms disk-key, attest, job nodes

Checked against `merod <command> --help` of 1.0.0-rc.29 and core's `operate/merod.mdx`.

## local: a development cluster in one process

```bash
merod local                                   # 3 nodes: http://127.0.0.1:2501/ … 2503, until Ctrl-C
merod local --nodes 1 --base-port 3500 --dir ./cluster
merod local --fresh                           # delete --dir first
merod local --bind 0.0.0.0 --ops-token devtoken   # in a container, ports published
```

| Flag                 | Default                                       | Meaning                                       |
| -------------------- | --------------------------------------------- | --------------------------------------------- |
| `--nodes N`          | `3`                                           | how many nodes                                |
| `--base-port P`      | `2500`                                        | node `i` listens on `P + i`                   |
| `--bind ADDR`        | `127.0.0.1`                                   | `0.0.0.0` in a container; URLs stay 127.0.0.1 |
| `--dir DIR`          | `.merod-local`                                | state, kept across restarts                   |
| `--fresh`            | off                                           | start from empty state                        |
| `--ops-token TOKEN`  | random, printed                               | the Ops API token (`MEROD_OPS_TOKEN`)         |
| `--registry-url URL` | none                                          | the registry the cluster installs from        |
| `--origins URL,...`  | `http://localhost:3000,http://localhost:5173` | origins allowed to run passkey ceremonies     |

Mock attestation, the development storage key for cluster `local`, raw WASM uploads, frontends
served under `localhost`, backups under `{dir}/backups`; each app gets `min(N, 3)` replicas. It
refuses a `--nodes` other than the count its `--dir` holds unless `--fresh`. It prints the node
URLs, the ops token and the meroctl commands that connect:

```bash
meroctl node add local http://127.0.0.1:2501/ --allow-mock
meroctl login --dev-passkey ./dev-passkey.json --name ada
```

`meroctl local up` does all of this in the background (one node by default, `--nodes 3` for three;
the release's Docker image unless `--local`). In Docker by hand:

```bash
docker run --rm -p 2501-2503:2501-2503 -v merod-local:/data \
  ghcr.io/calimero-network/merod:1.0.0-rc.29 local --bind 0.0.0.0 --ops-token devtoken
```

## inspect: a stopped node's data directory

```bash
merod --node n1 inspect                              # the raw layout, sealed sizes (JSON)
merod --node n1 inspect --storage-key-file k_r.hex   # plus each group's vote, applied index, membership
merod inspect --data-dir /data/n1
```

Stop the node first: `inspect` opens the store for writing. Its `--storage-key-file` holds K_r
itself as 64 hex characters, unlike `run --storage-key-file` (key material K_r derives from).

## kms disk-key: unlock a data disk at boot

```bash
merod kms disk-key --kms-url https://kms.internal.example.com/ --identity /data/disk-identity \
  --key-out /run/keys/disk.key --evidence-out /run/keys/kms-evidence.json
```

For an image's boot script, before `merod run`. The KMS is trusted only if its quote matches the
signed mero-tee release the environment names (`MERO_KMS_RELEASE_TAG`, else `MERO_KMS_VERSION`, else
`MERO_TEE_VERSION`). `--key-out` and `--evidence-out` must not exist yet and must be on tmpfs or
ramfs. `--create-identity` makes the identity for a disk being formatted. Pass the evidence to
`merod run --kms-disk-evidence FILE` to report it in the node's attestation.

## attest: a release attestation, before any key

```bash
merod attest --nonce <64 hex> --out attestation.json   # a quote over the nonce and this merod's release
merod attest --serve 0.0.0.0:7000                      # GET /attestation/release?nonce=… until stopped
merod attest --dev                                     # a mock quote
meroctl attest release --file attestation.json --nonce <hex>   # verify it
```

A quote over a verifier's nonce and the claim
`{ merodVersion, merodSha256, teeRelease, teeProfile, identity }`, made with no KMS key, store or
running node, so a manager checks a fresh TD's image **before** mero-kms releases a key to it.
`--identity PATH` binds a libp2p keypair's peer id (default: the configured `--kms-identity`).

## Job nodes

A job node runs compute (pipelines, compute actions) for one cluster's apps; it holds no app, store,
vote or cluster key, and serves only `/health`, `/attestation` and `/job/*`.

```bash
merod run --job-node --node-id 21 --listen 0.0.0.0:2528 --cluster eu1 \
  --cluster-identity "$(meroctl ops cluster | jq -r .identity)" --job-slots 4
meroctl ops add-node 21 https://job1.eu1.example.com/ --role job      # signed by the operator
```

Flags that would give it a cluster (`--bootstrap`, `--peers`, `--public-url`, storage-key and KMS
flags, `--ops-token`, governance, `--registry-url`, ...) are refused with `--job-node`. Test one
compute method alone on your machine with `meroctl local compute run`.

## In a container

The image's entrypoint is `merod`, with `CALIMERO_HOME=/data` and `/data` a volume, exposing 2528.
Every key can be an environment variable, so a container needs no `init`:

```bash
docker run -d --name n1 -p 2528:2528 -v n1-data:/data \
  -e MEROD_NODE_ID=1 -e MEROD_PUBLIC_URL=https://n1.eu1.example.com/ -e MEROD_DATA_DIR=/data/n1 \
  -e MEROD_CLUSTER=eu1 -e MEROD_PEERS=1=https://n1.eu1.example.com/,2=https://n2.eu1.example.com/ \
  -e MEROD_KMS_URL=https://kms.internal.example.com/ -e MEROD_KMS_IDENTITY=/data/disk-identity \
  -e MEROD_OPS_TOKEN_SHA256="$OPS_TOKEN_SHA256" -e MEROD_OPERATOR_KEY="$OPERATOR_PUBLIC_HEX" \
  -e MERO_TEE_VERSION="$RELEASE" -e MERO_TEE_PROFILE="$PROFILE" \
  ghcr.io/calimero-network/merod:1.0.0-rc.29 run
```

How a mero-tee TDX image launches `merod` (its boot script and paths) is defined by mero-tee, not
core; check the image's documentation.
