# Operator Runbooks (core 1.0)

Condensed from core's `operate/runbooks.mdx`. The commands assume:

```bash
export CALIMERO_API=https://n1.eu1.example.com/
export CALIMERO_TEE_PROFILES=<profile>
export CALIMERO_OPS_TOKEN=<ops token>
export CALIMERO_OPERATOR_KEY_FILE=./operator.key
```

## Form a cluster

Start every founding node with the same `--cluster`, governance flags and `--operator-key`, each
with its own `--node-id` and `--public-url`, `--peers` naming all of them, and `--bootstrap` on one
of them only (see `calimero-merod`). A cluster may start on one node (`--peers` naming only itself)
and grow; until it has three voters, that node is a single point of failure, and instances created
then get one replica.

## Add a node

1. Start it with the cluster's settings (`--cluster`, KMS identity, governance flags, `--rp-id`,
   `--origins`), its own `--node-id` and `--public-url`, **without** `--bootstrap`. It waits (its
   `/health` shows `waiting`) for up to 10 minutes.
2. Register it: `meroctl ops add-node 4 https://n4.eu1.example.com/ --zone eu1-b` (signed).
3. A peer delivers the cluster key to its registered address by attestation; it joins the system
   group as a learner. `meroctl ops status` lists it.
4. New instances may be placed on it (spread across zones, least-loaded first); move existing ones
   with `ops move`.

The system leader keeps exactly 3 voters (never 2), promoting caught-up learners in new zones first.
It does not grow past 3; a fourth node and later ones stay learners and host apps.

## Spread instances

```bash
meroctl ops placement                         # each instance's replicas, each node's count
meroctl ops move <instance> --replicas 1,2,3  # signed; sent on to the instance's leader
```

The leader hands the new nodes the bundle and blobs, adds them as learners, switches the voters, and
records it. One move or restore of an instance runs at a time (`409 MOVE_IN_PROGRESS`).

## Remove a node

1. Move every instance whose replicas name the node to a set that leaves it out.
2. `meroctl ops remove-node 4` against the system leader (signed).
3. Stop the process and retire its data disk. Only a signed `ops add-node` brings it back.

## A node is lost

App groups keep serving while a majority of each one's replicas answers; move the lost node's
instances to healthy nodes with `ops move`. Restarting a node on the same data directory resumes it.
If the system group loses a majority of its voters for good, sign-ins, installs and organization
changes stop: every survivor runs `meroctl ops backup --all`, then the cluster is founded again from
those backups (below).

## Back up and restore

- With `merod --backup-dir DIR`, each node writes a sealed snapshot of every group it leads every 60
  seconds (`{backup-dir}/{app}/…snap` with its `.manifest`), the system group's under `system/`, the
  code under `code/`, and the cluster key wrapped per release under `cluster-key/`. Copy the
  directory off every node (only leaders write); keep `cluster-key/` and `code/` with it.
- `meroctl ops backup` forces one now (before an app upgrade you may want to undo).
- Restore an instance to a backup (its later writes are lost, and an upgrade since is undone): put
  the backup and its manifest in a replica node's `--backup-dir`, then
  `meroctl ops restore <instance> [--backup <name>]` against that node (signed). Calls answer
  `409 APP_RESTORING` meanwhile. A backup restores on its release or a later one, never an older.

## Found a cluster again from backups

1. Collect every node's backups into one directory; stop every node of the old cluster.
2. Start a founder on an empty data directory, same `--cluster`, governance flags and
   `--operator-key`, on a release that kept a cluster-key copy:
   `merod run --bootstrap --restore-from /backups --backup-dir /backups --peers 1=...,2=...,3=...`.
3. Start the other peers without `--bootstrap`; they join as learners.
4. People sign in again; restore each instance with `meroctl ops restore <instance>`.

## Recover after every mero-kms is gone

Before (once, from 1.0.0-rc.20): on a machine that is not a node,
`meroctl ops recovery-keygen --out operator-backup.key`, then
`meroctl ops backup-key --public-key <hex>` (signed), and start nodes with `--recovery-dir`. Where
owners upgrade apps, each organization sets its own backup key.

After: stop every old node; start a founder with
`merod run --bootstrap --recover-from /recovery --peers ...`; run
`meroctl ops recover --key-file operator-backup.key`; then
`meroctl ops restore <instance> --recovery-key-file operator-backup.key` for each instance.

## Quotas

```bash
meroctl ops quotas
meroctl ops set-quotas '{"maxFileBytesPerOrg":50000000000}'
```

Defaults: 100 apps owned per account, 1 GiB of uploads, 50 API keys, 20 organizations owned, 100 000
accounts, 50 GB of files per organization, no daily fuel cap. A non-zero `maxFuelPerDeveloperPerDay`
is refused `409 UPGRADE_PENDING` until every node runs a release that knows it.

## Upgrade the cluster's release

A new `merod` reaches production as a new mero-tee release (a new image):

1. **Approve it.** Where the operator holds release approvals: `meroctl ops release <version>`.
   Where owners do (the default), each organization's owner approves with a passkey
   (`meroctl org approve-release ORG VERSION` on development clusters); a person's own instances are
   approved with `meroctl account approve-release VERSION`. Until then, nodes on the new release get
   none of that owner's data.
2. **Start nodes on the new image and add them** (`ops add-node`). Each new node's storage key comes
   from the new release's mero-kms; a peer delivers the cluster key by attestation.
3. **Move each instance** onto the new nodes (`ops move`).
4. **Remove the old nodes** once they host nothing (`ops remove-node`), then stop them. Until then,
   commands the new release brings are refused `409 FEATURE_NOT_ACTIVE`; afterwards the system
   leader raises the cluster version (`clusterVersion` in `ops placement`).
5. **Raise the floor** (`merod --peer-min-release`, clients' `--min-release`) only once every node
   runs the new release.

Not across a release the CHANGELOG marks **Hard cutover** (1.0.0-rc.20 was one): such a cluster is
recreated on the new release, not rolled.

## Upgrade apps

- **Owner (default)**: the instance's owner, or a holder of `MANAGE_APPLICATION`, approves with a
  passkey: `meroctl instance update INSTANCE --version V`, or an organization-wide run
  `meroctl team upgrade trigger ORG --package P --version V [--team T --cascade]`.
- **Operator** (`--app-upgrades operator`):

  ```bash
  meroctl ops install com.example.kv@1.3.0
  meroctl ops upgrade <instance> --version 1.3.0
  meroctl ops upgrade-org <org-id> --package com.example.kv --version 1.3.0 --team <team-id> --cascade
  meroctl team upgrade status <org-id> <run-id>
  ```

A run upgrades its instances one at a time and records each failure;
`meroctl team upgrade retry ORG RUN` runs the failed ones again.

## Rotate the ops token

Make a new token and its SHA-256, then on each node
`merod --node nX config --ops-token-sha256 <hash>` and restart it. The old token answers `403` on
each node as it restarts.
