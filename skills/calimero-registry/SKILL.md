# calimero-registry — Agent Instructions

You are helping a developer **sign and publish a Calimero app bundle** to the App Registry.

## Two tools required

| Tool | Install | Purpose |
| --- | --- | --- |
| `mero-sign` | `cargo install mero-sign` | Ed25519 key management and manifest signing |
| `calimero-registry` | `npm install -g calimero-registry` | Bundle creation and registry push |

## Critical: sign BEFORE bundling

mero-sign operates on `manifest.json` **before** it is packed. The registry verifies the
signature on upload — signing after bundling will fail.

**Correct order:**
1. Build WASM
2. Write `manifest.json`
3. `mero-sign sign manifest.json --key key.json`  ← sign first
4. `calimero-registry bundle create ...`           ← bundle second
5. `calimero-registry bundle push ...`             ← then push

## Quick reference

```bash
# 1. Install tools
cargo install mero-sign
npm install -g calimero-registry

# 2. Generate signing key (one-time per developer)
mero-sign generate-key --output my-key.json
echo "my-key.json" >> .gitignore

# 3. Sign
mero-sign sign dist/myapp/manifest.json --key my-key.json

# 4. Bundle
calimero-registry bundle create \
  --output myapp-1.0.0.mpk \
  dist/myapp/app.wasm \
  com.yourorg.myapp

# 5. Push
calimero-registry bundle push myapp-1.0.0.mpk --key my-key.json
```

## References

See `references/` for manifest format, signing details, and push workflow.
See `rules/` for hard constraints.
