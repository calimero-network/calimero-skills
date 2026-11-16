# Rule: Roll a new release by adding nodes, never by swapping the image under a node

## What's wrong

Upgrading a production node in place: stopping it, booting the new mero-tee image on the same data
disk, and starting `merod` again.

```text
this node's storage key does not open its cluster key
```

The new release's mero-kms gives the node another storage key (K_r), which does not unwrap the
cluster key stored on its disk, so the node stops.

## What's correct

1. Get the new release approved for the apps' data (owners with a passkey, or `ops release VERSION`
   where the operator holds release approvals).
2. Start **new** nodes on the new image, without `--bootstrap`, and register each:
   `meroctl ops add-node ID URL --zone Z`. A peer delivers the cluster key to it by attestation.
3. Move every instance onto them: `meroctl ops move INSTANCE --replicas ...`.
4. Remove the old nodes once they host nothing (`meroctl ops remove-node ID`), then stop them. The
   system leader then raises the cluster version, and the new release's features turn on.
5. Raise `--peer-min-release` (nodes) and `--min-release` (clients) last.

Retire the old release's mero-kms only once no node of that release remains. A release marked **Hard
cutover** in the CHANGELOG is not rolled at all: the cluster is recreated on it.

A development cluster is different: `meroctl local up --fresh` (or `merod local --fresh`) starts
over on the new release.

## Why

A node's disk is sealed under a key bound to its release, so an image change is a new node to the
cluster. Rolling by adding nodes keeps every instance on a majority of replicas throughout, and an
instance's data only ever moves to nodes on a release its owner approved.
