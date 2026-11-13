# calimero-registry — Agent Instructions

You are helping a developer **package, sign and publish a Calimero app** to the App Registry with
core's **`meroctl`**.

## One tool

`meroctl` is core's one command line (core 1.0.0-rc.24 and later). Its `app` commands that need no
node build, sign, pack, inspect and publish a release:

| Command                        | Does                                                                            | Replaces                                         |
| ------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------ |
| `meroctl app build [DIR]`      | The crate as a `calimero:app` component (and its compute component, if any)     | `mero-app-build`, `cargo mero build`             |
| `meroctl app signer new FILE`  | A new Ed25519 signing key, written owner-only                                   | `mero-sign generate-key`, `cargo mero key`       |
| `meroctl app signer id FILE`   | The key's `did:key` signer id                                                   | `mero-sign derive-signer-id`                     |
| `meroctl app pack [DIR]`       | Writes `manifest.json`, signs it, packs the `.mpk`                              | `scripts/pack-component.py`, `cargo mero bundle` |
| `meroctl app sign MANIFEST`    | Signs a `manifest.json` in place                                                | `mero-sign sign`, `cargo mero sign`              |
| `meroctl app inspect FILE.mpk` | Opens the bundle as a node does and prints `verified`, `signerId`, the manifest | —                                                |
| `meroctl app publish FILE.mpk` | Pushes the signed `.mpk` to the registry                                        | `calimero-registry bundle push`                  |

Install it from a core release (Linux x86_64/aarch64, macOS aarch64), checked against the release's
`SHA256SUMS`:

```bash
curl -fsSL https://raw.githubusercontent.com/calimero-network/core/master/scripts/install.sh | sh
meroctl --version
```

`cargo-mero`, `mero-sign`, `mero-app-build`, `scripts/pack-component.py` and the `install-sh`
repository are gone after core 1.0.0-rc.24.

## Quick workflow

```bash
# 1. A signing key (once). Keep it out of the repo: it is half of the app's identity.
meroctl app signer new release.key
echo "release.key" >> .gitignore

# 2. Build the component, write + sign manifest.json, pack the bundle
meroctl app pack logic --key release.key
# -> logic/dist/com.yourorg.myapp-0.1.0.mpk

# 3. Check it as a node would
meroctl app inspect logic/dist/com.yourorg.myapp-0.1.0.mpk

# 4. Publish (the API key from the registry's Organizations page, CLI Access)
export CALIMERO_REGISTRY_API_KEY=your-api-key
meroctl app publish logic/dist/com.yourorg.myapp-0.1.0.mpk
```

## Bundle metadata comes from Cargo.toml

Given the crate's directory, `meroctl app pack` reads `[package.metadata.calimero]` and the crate's
`[package] version`; flags win over the table. Keys are kebab-case.

```toml
[package]
name = "my-app"
version = "0.1.0"                       # appVersion, unless --app-version

[package.metadata.calimero]
package = "com.yourorg.myapp"           # required (or --package), reverse-DNS
name = "My App"                         # metadata.name; a registry needs it to list a new package
description = "Does something useful"
author = "Your Name"
icon = "../app/public/icon.png"         # a PNG, relative to the crate
category = "developer-tools"
tags = ["notes"]
min-runtime-version = "1.0.0-rc.19"     # the oldest node release that runs it
frontend-dir = "../app/dist"            # the static web build the bundle carries
frontend = "https://my-app.example.com" # links.frontend
github = "https://github.com/yourorg/myapp"
```

| `Cargo.toml` key                     | `manifest.json` field                    | Flag                          | Default              |
| ------------------------------------ | ---------------------------------------- | ----------------------------- | -------------------- |
| `package`                            | `package`                                | `--package`                   | required             |
| `[package] version`                  | `appVersion`                             | `--app-version`               | required             |
| `min-runtime-version`                | `minRuntimeVersion`                      | `--min-runtime-version`       | `0.1.0`              |
| `name`                               | `metadata.name`                          | `--name`                      | no `metadata` at all |
| `description`                        | `metadata.description`                   | `--description`               | omitted              |
| `icon` (PNG path)                    | `metadata.icon` (a data URI)             | `--icon`                      | omitted              |
| `category`                           | `metadata.category`                      | `--category`                  | omitted              |
| `author`, `license`, `tags`, `guide` | `metadata.*` (`guide` is a file, read)   | none                          | omitted              |
| `slug`                               | `handlers.slug`                          | none                          | the package          |
| `frontend`, `github`, `docs`         | `links.*` (http(s) URLs)                 | none                          | omitted              |
| `frontend-aliases`                   | `frontendAliases`                        | none                          | omitted              |
| `frontend-dir`                       | `frontend` (the files under `frontend/`) | `--frontend`, `--no-frontend` | none                 |
| `outbound`                           | `outbound`                               | `--outbound` (repeatable)     | none                 |
| `upgrades` (`owner` or `publisher`)  | `upgrades`                               | `--upgrades`                  | absent (the owner)   |

`--description`, `--icon` and `--category` need a `name` (the table's or `--name`). A `frontend-dir`
that does not exist yet is skipped with a note: build the frontend first, or pass `--no-frontend`.

## Pack flags

| Flag                                                                                                                                 | Description                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `--key <file>`                                                                                                                       | Sign with this key file; without it the **development key** signs (registry refuses) |
| `--previous <old>`                                                                                                                   | The last release: report ABI changes, refuse a state change without a version bump   |
| `--out <file>`                                                                                                                       | The `.mpk` (default `<DIR>/dist/<package>-<version>.mpk`, else `./` without a DIR)   |
| `--wasm <file>`                                                                                                                      | A component already built (skips the build); `--compute <file>` its compute part     |
| `--pipeline <file>`                                                                                                                  | A pipeline YAML to ship (repeatable)                                                 |
| `--frontend <dir>`                                                                                                                   | A static web build (`--frontend-entry`, default `index.html`)                        |
| `--app-version`, `--package`, `--min-runtime-version`, `--name`, `--description`, `--icon`, `--category`, `--outbound`, `--upgrades` | Override the table above                                                             |

There is no environment variable for the key: pass `--key`. The key file must be readable by its
owner only (`chmod 600`); `meroctl` refuses one that group or others can read.

## Publish flags

| Flag               | Environment                 | Default                          |
| ------------------ | --------------------------- | -------------------------------- |
| `--registry <url>` | `CALIMERO_REGISTRY_URL`     | `https://apps.calimero.network`  |
| `--api-key <key>`  | `CALIMERO_REGISTRY_API_KEY` | required                         |
| `--org <org>`      |                             | publish as a Calimero Cloud org  |
| `--cloud <url>`    | `CALIMERO_CLOUD_URL`        | `https://cloud.calimero.network` |
| `--public`         |                             | a new package is private         |

With `--org`, the API key is the Cloud organization's `ck_live_…` key (scope `registry:publish`);
`meroctl` trades it at the Cloud for a short publish token first. The registry must be `https://`
(or loopback). A refusal comes back with the registry's code (`version_not_allowed`,
`invalid_signature`, ...).

## Signing is mandatory

There is no unsigned install path. `meroctl app pack` signs as part of packaging, and the node
verifies both the signature and every artifact's SHA-256 before installing. See
`rules/signed-and-hashed.md`.

Your signing key is half of your app's on-node identity
(`ApplicationId = SHA-256(borsh((package, signerId)))`), so signing every release with the same key
is what makes the next release an upgrade rather than a new app. See `references/signing.md`.

## Package naming rules

- Must be reverse-domain format: `com.yourorg.appname`
- Version must be SemVer without `v` prefix: `1.0.0` not `v1.0.0`

## Updating an existing app (new version)

Bump `[package] version` (or pass `--app-version`), name the last release with `--previous`, and
sign with the **same** key - the signer is half the application id, so a different key publishes a
different app.

```bash
meroctl app pack logic --key release.key --app-version 1.1.0 \
  --previous logic/dist/com.yourorg.myapp-1.0.0.mpk
meroctl app publish logic/dist/com.yourorg.myapp-1.1.0.mpk
```

## CI auto-publish

Publish a new version automatically on every merge to the default branch that touches the contract:
install `meroctl` from a pinned core release, resolve the next version **from the registry itself**
(latest published `appVersion` + patch bump), pass it to `meroctl app pack --app-version`, and
`meroctl app publish` the `.mpk`. Users provide their own two secrets: `CALIMERO_SIGNING_KEY`
(generate with `meroctl app signer new`) and `CALIMERO_REGISTRY_API_KEY` (registry Organizations
page, or a Cloud organization's `ck_live_` key with `--org`). Full workflow template,
version-resolution snippet and gotchas: see `references/ci-auto-publish.md`.

## Related skills

- **`calimero-rust-sdk`** — building the app that gets published
- **`calimero-abi-codegen`** — `meroctl app abi diff` and the typed client
- **`calimero-core`** — application/context model and how the registry integrates with node app
  install

## References

See `references/` for manifest format, signing details, and the publish workflow. See `rules/` for
hard constraints.
