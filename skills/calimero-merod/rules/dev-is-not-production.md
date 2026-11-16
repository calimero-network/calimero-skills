# Rule: `--dev` and development keys only on development nodes

## What's wrong

Starting a node that holds real data with development settings, or carrying them into a production
configuration:

```bash
merod --node n1 init --dev --node-id 1 --public-url https://n1.eu1.example.com/ \
  --storage-key-file /etc/merod/key --allow-unsigned-bundles     # WRONG on a real node
```

`--dev` means mock attestation quotes (which prove nothing), a storage key the host chose (so
whoever runs the host reads the disks), plain unsealed requests, and raw WASM uploads with no
publisher signature. Clients only trust such a node with `--allow-mock` / `allowMock: true`.

## What's correct

Development: `merod local` (or `meroctl local up`), or a single `--dev` node on your machine.

```bash
merod local --nodes 1 --fresh
```

Production (TDX): no `--dev`; the storage key from mero-kms only; releases from a registry; the
image names its release and profile.

```bash
merod --node n1 init --node-id 1 --public-url https://n1.eu1.example.com/ --cluster eu1 \
  --kms-url https://kms.internal.example.com/ --kms-identity /data/disk-identity \
  --registry-url https://registry.example.com/ --ops-token-sha256 "$OPS_TOKEN_SHA256"
```

Check: no node runs with `--dev`, `--storage-key`, `--storage-key-file` or
`--allow-unsigned-bundles`; `MERO_TEE_VERSION` and `MERO_TEE_PROFILE` come from the image; clients
pass `--tee-profiles`, never `--allow-mock`.

## Why

merod refuses `--storage-key` and `--storage-key-file` without `--dev`, but nothing stops a whole
node being started in development mode. Its data is then readable by the host and its quotes are not
evidence of anything.
