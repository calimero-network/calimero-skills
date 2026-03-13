# Rule: Sign the manifest BEFORE bundling

mero-sign operates on a standalone `manifest.json` file — not on a `.mpk` archive.
Signing after `bundle create` will not work because the manifest is already packed.

## WRONG order:

```bash
calimero-registry bundle create --output app.mpk ...  # ✗ bundled first
mero-sign sign app.mpk --key key.json                  # ✗ can't sign a .mpk
```

## CORRECT order:

```bash
mero-sign sign dist/myapp/manifest.json --key key.json  # ✓ sign manifest.json
calimero-registry bundle create --output app.mpk ...    # ✓ then bundle
calimero-registry bundle push app.mpk --key key.json    # ✓ then push
```

## Why

The registry verifies the signature by re-running the RFC 8785 canonicalization on the
manifest fields inside the bundle. If the manifest was modified after signing — including
by the bundle tool itself — the signature check fails with `400 invalid_signature`.
