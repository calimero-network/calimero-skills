# Rule: Every bundle is signed, and every artifact hash must match its bytes

A node accepts a `.mpk` only when all three hold. There is no unsigned install path and no
"unhashed" manifest.

## 1. Signing is mandatory

`cargo mero bundle` always signs. Pass `--key <file>` to publish, `--dev` for local installs only
(the registry refuses dev-signed bundles), or set `MERO_SIGN_KEY` in CI.

```bash
cargo mero bundle --key my-key.json     # publishable
cargo mero bundle --dev                 # local / CI only
```

## 2. Every artifact carries its SHA-256

Each `wasm`, `abi`, `services[].wasm`, `services[].abi`, and `migrations[]` entry is
`{ path, size, hash }` where `hash` is the lowercase-hex SHA-256 of that file's bytes. The node
recomputes it and refuses to install on a mismatch.

A manifest with `"hash": null` or no `hash` key is **malformed**: it fails to parse before the
signature is even checked, so the bundle does not install at all.

```json
"wasm": {
  "path": "app.wasm",
  "size": 283441,
  "hash": "7db53183cb05feb146262096c5622eb295fe8cdc909dcdcbad8fadb89b6898f7"
}
```

Never hand-edit an artifact's `path`, `size`, or `hash`, and never swap a wasm into a bundle after
packing. Rebuild instead.

## 3. `manifest.json` is the first member of the archive

The `.mpk` is a tar.gz whose manifest scan is bounded and runs before the signature check, so
`manifest.json` must be at the archive root and appear first. `cargo mero bundle` writes it that
way. A second entry at `manifest.json` is rejected outright.

## Why the order matters

The signature covers the RFC 8785 canonicalization of the manifest fields, and the manifest's hashes
cover the artifact bytes. Editing anything after signing invalidates the chain. So the sequence is
fixed: build -> hash -> write manifest -> sign -> pack, which is exactly what one
`cargo mero bundle` does. Then push the `.mpk` untouched:

```bash
cargo mero bundle --key my-key.json
calimero-registry bundle push dist/com.yourorg.myapp.mpk --remote
```

There is **no `--key` flag on `bundle push`**. It only takes `--local` / `--remote` / `--url` /
`--api-key`.
