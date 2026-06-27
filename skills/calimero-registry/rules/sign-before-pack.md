# Rule: Create the bundle, THEN sign its manifest, THEN push

`mero-sign` operates on a standalone `manifest.json` file — not on a `.mpk` archive.
`calimero-registry bundle create` is what _generates_ that `manifest.json` (it writes
`manifest.json` + `app.wasm` into the output directory). So the order is: create → sign → push.

You cannot sign before `bundle create`, because the manifest does not exist yet.

## WRONG order:

```bash
mero-sign sign dist/myapp/manifest.json --key key.json    # ✗ manifest.json doesn't exist yet
calimero-registry bundle create --output app.mpk ...      # ✗ create would overwrite it anyway
```

## CORRECT order:

```bash
# 1. create — emits manifest.json (+ app.wasm) into the output dir
calimero-registry bundle create --output dist/myapp/ ...

# 2. sign — write the signature block into the generated manifest.json in-place
mero-sign sign dist/myapp/manifest.json --key key.json

# 3. push — upload the signed bundle (file or dir) to the registry
calimero-registry bundle push dist/myapp/ --remote
```

There is **no `--key` flag on `bundle push`** — signing happens entirely via `mero-sign` in step 2.
`bundle push` only takes `--local` / `--remote` / `--url` / `--api-key`.

This is exactly the two-step sequence the CLI itself prints after `bundle create`:

```text
Next steps:
  1. Sign the manifest:  mero-sign sign <output>/manifest.json --key key.json
  2. Push the bundle:    calimero-registry bundle push <output> --remote
```

## Why

The registry re-runs the RFC 8785 canonicalization on the manifest fields inside the bundle and
verifies the Ed25519 signature against them. If the manifest is modified _after_ signing — including
by re-running `bundle create` over it — the signature check fails. So `bundle create` must come
first, then `mero-sign sign`, then `bundle push` with the signed manifest left untouched.
