# meroctl ops — Command Reference (core 1.0)

Checked against `meroctl ops <command> --help` of 1.0.0-rc.29 and core's `operate/meroctl.mdx` and
`operate/runbooks.mdx`. Every command needs the ops token (`--ops-token` or `CALIMERO_OPS_TOKEN`).
Those marked **signed** are operator decisions: the node answers `428 OPERATOR_SIGNATURE_REQUIRED`
and meroctl signs with `--operator-key-file` (`CALIMERO_OPERATOR_KEY_FILE`). Output is JSON.

Global flags go before `ops`:

```bash
meroctl --api https://n1.eu1.example.com/ --tee-profiles <profile> \
  --ops-token "$OPS_TOKEN" --operator-key-file ./operator.key ops status
```

## Look

| Command          | What it answers                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `ops status`     | this node, the system group's and its app groups' Raft status, governance, fleet, counts |
| `ops placement`  | every instance's replicas; each node's zone, release, instance count; `clusterVersion`   |
| `ops cluster`    | the cluster's name and identity key (`merod run --job-node --cluster-identity`)          |
| `ops metrics`    | Prometheus text (also `merod --metrics-listen` for a scraper)                            |
| `ops packages`   | installed applications                                                                   |
| `ops quotas`     | the quotas                                                                               |
| `ops pools`      | the compute pools and the runs each takes at once                                        |
| `ops prices`     | the operator's price table (`{}` until set)                                              |
| `ops backup-key` | the operator's backup key and the instances it covers                                    |

## Nodes and placement

```bash
meroctl ops add-node 4 https://n4.eu1.example.com/ --zone eu1-b      # signed; a learner of the system group
meroctl ops add-node 21 https://job1.eu1.example.com/ --role job --pool gpu   # a job node (compute only)
meroctl ops move <instance> --replicas 2,3,4                          # signed; retried at the app's leader
meroctl ops remove-node 4                                             # signed; against the system leader
```

- `add-node ID ADDR [--zone Z] [--role replica|job] [--pool P]`. A replica node joins as a learner
  and becomes a voter while the system group has fewer than 3.
- `move INSTANCE --replicas IDS`: refused with `TOO_FEW` (fewer than `min(3, nodes)`),
  `DUPLICATE_REPLICA`, `UNKNOWN_NODE`, `403` (a node whose release the owner has not approved) or
  `409 MOVE_IN_PROGRESS`. A move to the set the instance already has answers `unchanged: true`.
- `remove-node ID`: refused while an instance keeps a replica on the node; another node than the
  system leader answers `421 NOT_LEADER`.

## Backups and recovery

```bash
meroctl ops backup                       # snapshots of the groups this node leads
meroctl ops backup --all                 # every group it holds, leader or not (disaster recovery)
meroctl ops restore <instance>           # signed; the node's newest backup of it
meroctl ops restore <instance> --backup <file name>
meroctl ops recovery-keygen --out operator-backup.key          # on a machine that is not a node
meroctl ops backup-key --public-key <hex>                      # signed
meroctl ops recover --key-file operator-backup.key             # on a founder started with --recover-from
meroctl ops restore <instance> --recovery-key-file operator-backup.key   # signed; from the recovery disk
```

`restore` reads `{backup-dir}/{app}/{name}` on the node it is sent to, which seeds the instance and
becomes its first replica; everything the instance wrote after the backup is lost. With
`--recovery-key-file` it reads the recovery disk instead (`--recovery-file NAME`, else the newest).

## Quotas, pools, prices

```bash
meroctl ops set-quotas '{"maxFileBytesPerOrg":50000000000}'                # signed; fields left out keep their value
meroctl ops set-quotas '{"maxFuelPerDeveloperPerDay":"1000000000000"}'      # a decimal string; "0" is no limit
meroctl ops set-pools '{"gpu":{"runsPerNode":2,"maxMemoryMib":8192}}'
```

`set-prices JSON` sets the price table
(`{ version, fuelPerVcpuSecond, vcpuSecond, gibSecond, connectorGib, storageGibMonth, egressGib }`,
version = current + 1). An unknown field is refused.

## Releases, packages and upgrades (where governance gives them to the operator)

```bash
meroctl ops release 2.4.0                          # signed; approve a mero-tee release for every app
meroctl ops release 2.3.120 --withdraw             # signed
meroctl ops outbound --package com.example.kv --prefix https://api.example.com/   # signed
meroctl ops install com.example.kv@1.3.0           # from the registry; --path FILE for a signed .mpk
meroctl ops uninstall com.example.kv --version 1.2.0
meroctl ops upgrade <instance> --version 1.3.0     # signed
meroctl ops upgrade-org <org-id> --package com.example.kv --version 1.3.0 --team <team-id> --cascade
meroctl team upgrade status <org-id> <run-id>      # follow the run
meroctl team upgrade retry <org-id> <run-id>       # the failed instances, as a new run
```

- `ops release` only where `--release-approvals operator`; else each organization's owner runs
  `meroctl org approve-release ORG VERSION` (or `meroctl account approve-release VERSION` for a
  personal organization), with a passkey.
- `ops install|upgrade|upgrade-org` only where `--app-upgrades operator`; else owners run
  `meroctl instance update` and `meroctl team upgrade trigger`.
- `ops outbound` only where `--outbound-approvals operator` (`--replace` replaces the list).
- `ops upgrade` also takes `--package`, `--service`, `--bundle`. `--migrate` is refused
  (`422 UPGRADE_FAILED`, `MigrationsNotSupported`): an upgrade is code only, the state stays.

## Through the API only

Sign-up policy and invites (`POST /ops/sign-up`, `/ops/sign-up/invites`), deployer grants, and
moving deployments from `open` to `granted` (`POST /ops/deployments/granted`) have no `ops`
subcommand, and `meroctl raw` does not sign operator decisions. Use the Python client, which answers
the `428` with its operator key:

```python
from calimero_client_py import Client

ops = Client(node_url, tee_profiles=["<profile>"])
ops.use_api_key(ops_token)                 # the ops token
ops.use_operator_key(operator_seed_hex)    # signs each 428 OPERATOR_SIGNATURE_REQUIRED
ops.ops.sign_up_set(policy="invite")
ops.ops.sign_up_invite_create(token="sup_<random>", uses=1, expires_at="2026-12-01T00:00:00Z")
ops.ops.deployments_granted()
```
