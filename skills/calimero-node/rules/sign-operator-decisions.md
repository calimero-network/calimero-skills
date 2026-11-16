# Rule: Sign operator decisions with the operator key, kept off the nodes

## What's wrong

Sending an operator decision with the ops token alone, or putting the operator's private key on a
node:

```bash
meroctl --ops-token "$TOKEN" ops add-node 4 https://n4.eu1.example.com/
# 428 OPERATOR_SIGNATURE_REQUIRED: the node wants the operator's signature, not just the token

merod --node n1 init --operator-key "$(cat operator.key)" ...   # WRONG: that is the private seed
```

## What's correct

The ops token authenticates the operator; the operator key decides. Nodes are started with the
**public** half (`merod --operator-key HEX`, recorded at genesis); meroctl holds the private seed
and signs what the node names:

```bash
meroctl --ops-token "$TOKEN" --operator-key-file ./operator.key \
  ops add-node 4 https://n4.eu1.example.com/ --zone eu1-b
```

Signed decisions: `ops add-node`, `ops remove-node`, `ops move`, `ops restore`, `ops set-quotas`,
`ops backup-key --public-key`, and where governance gives them to the operator, `ops release`,
`ops outbound`, `ops upgrade` and `ops upgrade-org`. Set `CALIMERO_OPERATOR_KEY_FILE` in the
operator's shell to stop passing it.

Keep the operator key, and the backup key from `ops recovery-keygen`, on the operator's machine,
never on a node: a node that holds them could approve its own decisions.

## Why

Every operator decision is logged with its signature and judged against the key recorded at genesis
on every replica. A cluster started without `--operator-key` refuses them all (a development cluster
has none).
