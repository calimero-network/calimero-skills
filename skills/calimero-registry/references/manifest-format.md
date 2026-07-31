# Manifest Format

`manifest.json` describes the app bundle. `cargo mero bundle` generates it, signs it, and writes it
as the **first member** of the `.mpk` tar archive.

## Artifact objects

Every artifact reference - the top-level `wasm` and `abi`, each `services[]` entry's `wasm`/`abi`,
and each `migrations[]` entry - is an object with three required fields:

| Field  | Type   | Description                                              |
| ------ | ------ | -------------------------------------------------------- |
| `path` | string | Path of the file inside the `.mpk`, relative to its root |
| `size` | number | Byte length of the file                                  |
| `hash` | string | Lowercase-hex SHA-256 of the file's bytes                |

`hash` is what binds the signed manifest to the bytes it describes. The node recomputes the SHA-256
of each artifact and refuses to install the bundle when it disagrees with the manifest. A manifest
with `"hash": null`, or with the key missing, is rejected as **malformed at parse time** - before
the signature is checked - so such a bundle never installs at all.

Never hand-write these values. `cargo mero bundle` computes them from the bytes it stages.

## Single-service manifest

A bundle with one service uses top-level `wasm` / `abi`:

```json
{
  "version": "1.0",
  "package": "com.example.myapp",
  "appVersion": "1.0.0",
  "minRuntimeVersion": "0.1.0",
  "metadata": {
    "name": "My Application",
    "description": "Application description",
    "author": "Your Name"
  },
  "wasm": {
    "path": "app.wasm",
    "size": 283441,
    "hash": "7db53183cb05feb146262096c5622eb295fe8cdc909dcdcbad8fadb89b6898f7"
  },
  "abi": {
    "path": "abi.json",
    "size": 3294,
    "hash": "56f2026ee3bf797d070812922ff571bb1b6dbd83965d5f693240c56f47b6700f"
  },
  "migrations": [],
  "links": {
    "frontend": "https://example.com"
  }
}
```

`version` is the manifest **schema** version and is always `"1.0"`. The app's own version is
`appVersion`, which defaults to the crate's `[package] version` and is overridable with
`cargo mero bundle --app-version <v>`.

`migrations` is always present (an empty array when there are none); the registry preserves it as-is
because dropping it would change the signed payload.

## Multi-service manifest

A bundle that ships more than one WASM service lists them under `services[]` instead of a top-level
`wasm`, with artifacts staged at `services/<name>.wasm` and `services/<name>-abi.json`. This is what
the registry's multipart `push-file` endpoint expects:

```json
{
  "version": "1.0",
  "package": "com.example.myapp",
  "appVersion": "1.0.0",
  "minRuntimeVersion": "0.1.0",
  "metadata": {
    "name": "My Application",
    "description": "Application description",
    "author": "Calimero Studio"
  },
  "services": [
    {
      "name": "chat",
      "wasm": {
        "path": "services/chat.wasm",
        "size": 283441,
        "hash": "61e8d9e2e1f7dc925781bb55a64d09a0c4867dda8fdcafb465b3004f5724619d"
      },
      "abi": {
        "path": "services/chat-abi.json",
        "size": 3294,
        "hash": "5f6b00fd7bd4f7c3c663fd8987eaf1f18da171a7ff33ef89b6870b1af4a381b4"
      }
    }
  ],
  "migrations": [],
  "links": {
    "frontend": "https://my-app.example.com/",
    "github": "https://github.com/example/myapp"
  }
}
```

Each `services[]` entry has a `name` plus `wasm` and `abi` artifact objects. When `services` is
present and non-empty it takes priority over any top-level `wasm`/`abi`.

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

There is no timestamp field. `minRuntimeVersion` defaults to `0.1.0` when the metadata does not set
it. The registry accepts either these core key names (`algorithm`/`publicKey`/`signature`) or the
short names (`alg`/`pubkey`/`sig`), but `cargo mero` always writes the long form. See
`references/signing.md`.

## Package ownership

- The first push establishes the package owner via the Ed25519 `signature.publicKey`
- Only the owner (or keys in `manifest.owners`) can push subsequent versions
- For team publishing, add teammates' public keys to `manifest.owners`:

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
