# calimero-node — Agent Instructions

You are helping a **node operator** run a Calimero 1.0 cluster: register and retire nodes, place and
move app instances, back them up and restore them, set quotas, approve releases and upgrade apps and
the cluster itself. The operator's commands are `meroctl ops ...`; the node binary is `merod` (see
`calimero-merod`); everything else meroctl does is `calimero-meroctl`.

This skill teaches core 1.0 (1.0.0-rc.29). The 0.x node (one node per context member, peers and
gossip, `meroctl context join`, `peers`, `context sync`, an admin JWT) is gone; there is no operator
command that reads or joins an app's data.

## What the operator holds

- **The ops token**: the bearer for the Ops API (`/ops/*`). Nodes are started with it
  (`merod --ops-token`, or better `--ops-token-sha256 HEX` so the machine holds nothing usable).
  meroctl sends it with `--ops-token` or `CALIMERO_OPS_TOKEN`.
- **The operator key**: an Ed25519 key whose public half every node is started with
  (`merod --operator-key HEX`, recorded at genesis). Every operator decision must carry its
  signature: the node answers `428 OPERATOR_SIGNATURE_REQUIRED` with the bytes, and meroctl signs
  them with `--operator-key-file FILE` (`CALIMERO_OPERATOR_KEY_FILE`; a 32-byte seed, hex). Keep it
  off the nodes.
- **What it sees**: counts, Raft status, placement and each app's usage under its opaque id. The Ops
  API has no read path into apps' data, names or credentials.

```bash
export CALIMERO_API=https://n1.eu1.example.com/
export CALIMERO_TEE_PROFILES=<profile>        # trust the cluster's image; required on real nodes
export CALIMERO_OPS_TOKEN=<ops token>
export CALIMERO_OPERATOR_KEY_FILE=./operator.key

meroctl ops status          # this node, its Raft groups, governance, the fleet directory, counts
meroctl ops placement       # where every instance's replicas are; each node's zone, release, count
meroctl ops cluster         # the cluster's name and identity key (for job nodes)
meroctl network status      # GET /health: this node, its release, who leads the system group
```

On a development cluster, `meroctl local up` prints its ops token
(`meroctl --ops-token "$TOKEN" ops status`); its nodes have no operator key, so signed decisions are
refused there.

## Governance decides who does what

Fixed at the cluster's first start (`merod` flags, attested with every receipt key):

| Flag                   | Values                                   | Operator's commands when it holds it            |
| ---------------------- | ---------------------------------------- | ----------------------------------------------- |
| `--release-approvals`  | `owner` (default) \| `operator`          | `ops release VERSION [--withdraw]`              |
| `--app-upgrades`       | `owner` (default) \| `operator`          | `ops install`, `ops upgrade`, `ops upgrade-org` |
| `--outbound-approvals` | `owner` (default) \| `operator`          | `ops outbound --package P --prefix URL`         |
| `--deployments`        | `open` (default) \| `granted`            | deployer grants (Ops API)                       |
| `--sign-up`            | `open` (default) \| `invite` \| `closed` | sign-up invites (Ops API)                       |

Where owners hold a decision, the operator cannot make it: each organization's owner (or holder of
the capability) approves with a passkey.

## Key facts

- **A node joins by registration**: start it with the cluster's settings and without `--bootstrap`,
  then `meroctl ops add-node ID URL [--zone Z]` (signed). It joins the system group as a learner;
  the leader keeps exactly 3 voters, promoting learners while there are fewer.
- **Retire a node** by moving every instance off it (`ops move INSTANCE --replicas ...`), then
  `ops remove-node ID` against the system leader.
- **Backups** need `merod --backup-dir`; nodes write sealed snapshots every 60 s and
  `ops backup [--all]` forces one. `ops restore INSTANCE [--backup NAME]` rolls an instance back
  (signed). They open only on a node holding the same cluster key.
- **The recovery disk** (`--recovery-dir`) holds backups sealed to the backup holder's key
  (`ops recovery-keygen`, `ops backup-key --public-key`), for recovering after every mero-kms is
  gone (`merod run --bootstrap --recover-from DIR`, then `ops recover`).
- **Quotas** live in the system state: `ops quotas`, `ops set-quotas JSON` (signed); refusals are
  `429 QUOTA_EXCEEDED`.
- **The cluster's release is upgraded with new nodes**, never a new image under an old node: add
  nodes on the new mero-tee release, move instances onto them, remove the old ones.
- **App upgrades** where the operator holds them: `ops install PACKAGE@VERSION`, then
  `ops upgrade INSTANCE --version V` or
  `ops upgrade-org ORG --package P --version V [--team T --cascade]`, followed with
  `meroctl team upgrade status ORG RUN`. An upgrade is code only: a named `--migrate` is refused in
  this version.

## References

- `references/ops-commands.md`: every `meroctl ops` command with its flags and what it signs.
- `references/runbooks.md`: add, remove and move nodes; back up, restore and recover; quotas;
  release approvals; upgrade the cluster and its apps.

## Rules

- `rules/sign-operator-decisions.md`: pass the operator key; never put it on a node.
- `rules/new-nodes-for-a-new-release.md`: roll a release by adding nodes, never in place.
