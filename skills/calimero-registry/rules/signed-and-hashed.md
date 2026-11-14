# Rule: Every bundle is signed, and every artifact hash must match its bytes

A node accepts a `.mpk` only when all three hold. There is no unsigned install path and no
"unhashed" manifest.

## 1. Signing is mandatory

`meroctl app pack` always signs. Pass `--key <file>` to publish; without it the development key
signs, for a development cluster only (the registry refuses dev-signed bundles, and so does a node
not running with `--dev`).

```bash
meroctl app pack logic --key my-key.json     # publishable
meroctl app pack logic                       # development key: local only
```

## 2. Every artifact carries its SHA-256

Each `wasm`, `compute`, `pipelines[]`, `frontend.files[]` and `services[]` artifact is
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
`manifest.json` must be at the archive root and appear first. `meroctl app pack` writes it that way.
A second entry at `manifest.json` is rejected outright.

## Why the order matters

The signature covers the RFC 8785 canonicalization of the manifest fields, and the manifest's hashes
cover the artifact bytes. Editing anything after signing invalidates the chain. So the sequence is
fixed: build -> hash -> write manifest -> sign -> pack, which is exactly what one `meroctl app pack`
does. Check it as a node would, then publish the `.mpk` untouched:

```bash
meroctl app pack logic --key my-key.json
meroctl app inspect logic/dist/com.yourorg.myapp-0.1.0.mpk
meroctl app publish logic/dist/com.yourorg.myapp-0.1.0.mpk
```

There is **no `--key` flag on `app publish`**. It takes `--registry`, `--api-key`, `--org`,
`--cloud` and `--public`.
