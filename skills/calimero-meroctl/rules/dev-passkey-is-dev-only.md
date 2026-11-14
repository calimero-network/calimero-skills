# Rule: File Passkeys and `--allow-mock` Are for Development Clusters Only

**Use `login --dev-passkey` and `--allow-mock` against `meroctl local` (or another `--dev` node).
Against a real cluster use an API key and `--tee-profiles`.**

## Why

A `--dev-passkey` file is a passkey kept on disk. Only a development cluster's `localhost` relying
party accepts one, and `login` refuses without `--allow-mock`, which trusts a mock quote: a node
that proves nothing about the code it runs. A real cluster's nodes are TDX VMs; meroctl judges their
quotes against the mero-tee release images you name with `--tee-profiles` (without it every real
quote is refused) and `--min-release`. People sign in there with platform passkeys in a browser, and
owner approvals happen in the console; meroctl uses an API key.

## Correct

```bash
# development cluster
meroctl local up                                            # node `local`, mock quote trusted
meroctl login --dev-passkey ./dev-passkey.json --name ada
meroctl namespace invite <org-id> --uses 1 --dev-passkey ./dev-passkey.json

# real cluster
export CALIMERO_API_KEY=cal_...                             # made in the console
meroctl node add prod https://node.example.com
meroctl --tee-profiles <profile> --min-release 2.3.109 whoami
```

## Wrong

```bash
meroctl node add prod https://node.example.com --allow-mock      # trusts any mock quote
meroctl --node prod login --dev-passkey ./dev-passkey.json       # a real cluster refuses it
```
