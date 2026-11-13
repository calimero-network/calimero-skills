# Manifest Format

`manifest.json` describes the app bundle. `meroctl app pack` generates it, signs it, and writes it
as the **first member** of the `.mpk` tar archive. `meroctl app inspect <file.mpk>` prints it back,
verified.

## Artifact objects

Every artifact reference - the top-level `wasm` and `compute`, each `pipelines[]` and
`frontend.files[]` entry, and each `services[]` entry's artifacts - is an object with three required
fields:

| Field  | Type   | Description                                              |
| ------ | ------ | -------------------------------------------------------- |
| `path` | string | Path of the file inside the `.mpk`, relative to its root |
| `size` | number | Byte length of the file                                  |
| `hash` | string | Lowercase-hex SHA-256 of the file's bytes                |

`hash` is what binds the signed manifest to the bytes it describes. The node recomputes the SHA-256
of each artifact and refuses to install the bundle when it disagrees with the manifest. A manifest
with `"hash": null`, or with the key missing, is rejected as **malformed at parse time** - before
the signature is checked - so such a bundle never installs at all.

Never hand-write these values. `meroctl app pack` computes them from the bytes it packs.

## Single-service manifest

What `meroctl app pack` writes for one app component (the ABI is embedded in the component, so there
is no separate `abi` artifact):

```json
{
  "version": "1.0",
  "package": "com.example.myapp",
  "appVersion": "1.0.0",
  "minRuntimeVersion": "1.0.0-rc.19",
  "wasm": {
    "path": "app.wasm",
    "size": 283441,
    "hash": "7db53183cb05feb146262096c5622eb295fe8cdc909dcdcbad8fadb89b6898f7"
  },
  "metadata": {
    "name": "My Application",
    "description": "Application description",
    "author": "Your Name",
    "tags": []
  },
  "handlers": { "slug": "com.example.myapp" },
  "links": {
    "frontend": "https://example.com"
  }
}
```

`version` is the manifest **schema** version and is always `"1.0"`. The app's own version is
`appVersion`, which defaults to the crate's `[package] version` and is overridable with
`meroctl app pack --app-version <v>`.

Optional fields `pack` adds when asked: `compute` (`compute.wasm`, from `--compute` or a crate with
compute methods), `pipelines` (`pipelines/<name>`, from `--pipeline`), `frontend`
(`{ entry, files }` under `frontend/`, from `--frontend` or `frontend-dir`), `frontendAliases`,
`outbound` and `upgrades`. `metadata` is written only when the app has a `name`.
`meroctl app publish` adds an empty `migrations` array to what it sends when the manifest has none.

## Multi-service manifest

A bundle that ships more than one service lists them under `services[]` instead of a top-level
`wasm`; when `services` is present and non-empty it takes priority over any top-level `wasm`.
`meroctl app pack` has no flag for it: such a release writes its own `manifest.json` (artifacts
under `services/`), signs it with `meroctl app sign manifest.json --key <file>`, and tars it with
`manifest.json` first. Check the result with `meroctl app inspect`.

## Signature block

Signing adds a top-level `signerId` (the signer's `did:key`) and a `signature` block with the keys
`algorithm`, `publicKey`, `signature`:

```json
{
  "version": "1.0",
  "package": "com.example.myapp",
  "signerId": "did:key:z6Mkt7Ejb12a1BxvRiUpd5YWkMrk8KVjaShW2vMt6trm7FGH",
  "signature": {
    "algorithm": "ed25519",
    "publicKey": "yuKE404BaldXazEIUC4XrVGFyXxxyoRVjrrGhcKk1P4",
    "signature": "base64url-64-bytes"
  }
}
```

There is no timestamp field. `meroctl app pack` writes `minRuntimeVersion` (default `0.1.0`) and
signing refuses a manifest without it. The registry accepts either these core key names
(`algorithm`/`publicKey`/`signature`) or the short names (`alg`/`pubkey`/`sig`), but `meroctl`
always writes the long form. See `references/signing.md`.

## Package ownership

- The first push establishes the package owner via the Ed25519 `signature.publicKey`
- Only the owner (or keys in `manifest.owners`) can push subsequent versions
- To publish as an organization instead of one key, use `meroctl app publish --org <org>` with the
  Cloud organization's `ck_live_` key
- For team publishing, add teammates' public keys to `manifest.owners` (`pack` writes no `owners`:
  add it to the manifest and sign with `meroctl app sign`):

```json
{
  "version": "1.0",
  "package": "com.example.myapp",
  "owners": ["yuKE404BaldXazEIUC4XrVGFyXxxyoRVjrrGhcKk1P4", "anotherTeammatePubKey..."]
}
```

## Package naming

| Rule                        | Example                  |
| --------------------------- | ------------------------ |
| Must be reverse-domain      | `com.yourorg.appname` ✅ |
| Version must be full SemVer | `1.0.0` ✅               |
| No `v` prefix on version    | `v1.0.0` ❌              |

## `links.frontend` is used by Desktop

The Desktop app reads `links.frontend` to know which URL to open when a user opens this app. Set it
via the `frontend` key in `[package.metadata.calimero]` so every bundle carries it.
