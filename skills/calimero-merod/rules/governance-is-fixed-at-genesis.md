# Rule: Give every founding node the same governance flags and operator key

## What's wrong

Starting a cluster without deciding governance, then trying to change it on a later start:

```bash
merod --node n1 run --bootstrap                       # genesis: owner approvals, no operator key
merod --node n1 config --release-approvals operator   # changes the file, not the cluster
merod --node n1 run                                   # still `owner`; operator decisions refused
```

## What's correct

Decide before the first start, and pass the same values to every founding node (and to nodes added
later, and to a cluster founded again from backups, which refuses different ones):

```bash
merod --node n1 init --node-id 1 --public-url https://n1.eu1.example.com/ --cluster eu1 \
  --release-approvals operator --app-upgrades owner --outbound-approvals owner \
  --deployments granted --deployers operator --sign-up invite \
  --operator-key "$OPERATOR_PUBLIC_HEX" ...
```

| Flag                   | Decides                                                                          | Default    |
| ---------------------- | -------------------------------------------------------------------------------- | ---------- |
| `--release-approvals`  | who approves the mero-tee releases that may hold app data                        | `owner`    |
| `--app-upgrades`       | who upgrades instances to another bundle                                         | `owner`    |
| `--outbound-approvals` | who approves the URL prefixes apps may call out to                               | `owner`    |
| `--deployments`        | who may install apps: anyone, or granted deployers                               | `open`     |
| `--deployers`          | who grants deployers                                                             | `operator` |
| `--sign-up`            | who may create an account                                                        | `open`     |
| `--operator-key`       | the operator's Ed25519 public key; without it every operator decision is refused | none       |

## Why

The cluster's first leader writes these into the system state at genesis, before any account exists,
and every node attests them with its receipt key, so clients can check them. Changing a flag later
changes nothing. The only changes after genesis are signed: deployments from `open` to `granted`
(never back), and the sign-up policy.
