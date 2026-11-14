# Pack & Publish

## Install

```bash
# meroctl: builds, signs, packs, inspects and publishes the .mpk
curl -fsSL https://raw.githubusercontent.com/calimero-network/core/master/scripts/install.sh | sh

# a pinned release
curl -fsSL https://raw.githubusercontent.com/calimero-network/core/master/scripts/install.sh \
  | sh -s -- meroctl --version 1.0.0-rc.24
```

`meroctl` ships prebuilt as `meroctl_<target>.tar.gz` on every core release (Linux x86_64 and
aarch64, macOS aarch64). From a core checkout, `cargo install --locked --path crates/meroctl` builds
it. Building the component needs Rust and the `wasm32-wasip2` target
(`rustup target add wasm32-wasip2`).

## Build the component

```bash
meroctl app build logic --out my-app.wasm
```

It builds the crate for `wasm32-wasip2` into a `calimero:app` component with its ABI embedded
(default `logic/app.component.wasm`), and its compute component when the crate has compute methods
(`--compute-out`, default `compute.component.wasm` beside it). `--target-dir` sets cargo's target
directory.

## Pack the bundle

```bash
meroctl app pack logic --key my-key.json
```

Given the crate's directory, this builds the components (unless `--wasm` / `--compute` name them),
reads `[package.metadata.calimero]` and the crate's version, writes `manifest.json` with each
artifact's SHA-256, signs it, and writes `logic/dist/<package>-<version>.mpk`. The skill's metadata
table lists what the `Cargo.toml` keys become.

Without a crate, name everything with flags:

```bash
meroctl app pack --wasm my-app.wasm --package com.yourorg.myapp \
  --app-version 1.0.0 --key my-key.json --out dist/com.yourorg.myapp-1.0.0.mpk
```

| Flag                          | Description                                                               |
| ----------------------------- | ------------------------------------------------------------------------- |
| `--key <file>`                | Sign with a production Ed25519 key file; without it, the development key  |
| `--app-version <v>`           | Override `appVersion` (defaults to the crate's version)                   |
| `--package <id>`              | Override the reverse-DNS package id                                       |
| `--min-runtime-version <v>`   | The oldest node release that runs it (default: the table's, else `0.1.0`) |
| `--out <path>`                | Output path (default `<DIR>/dist/<package>-<version>.mpk`)                |
| `--wasm <file>`               | The app component, already built                                          |
| `--compute <file>`            | Its compute component, packed as `compute.wasm`                           |
| `--pipeline <file>`           | A pipeline YAML (repeatable), packed under `pipelines/`                   |
| `--frontend <dir>`            | A static web build, packed under `frontend/` and checked with node rules  |
| `--frontend-entry <file>`     | The page served at `/` (default `index.html`)                             |
| `--no-frontend`               | Leave out the table's `frontend-dir`                                      |
| `--outbound <https prefix>`   | A URL prefix the app's runs may call (repeatable)                         |
| `--upgrades owner\|publisher` | Who upgrades the package's instances (absent: the owner)                  |
| `--previous <old>`            | The last release: report ABI changes before signing                       |

## Inspect it

```bash
meroctl app inspect logic/dist/com.yourorg.myapp-1.0.0.mpk
```

Opens the bundle as a node does (the signature, every artifact's hash) and prints `verified`,
`signerId`, `bundleHash` and the manifest.

## Publish

```bash
export CALIMERO_REGISTRY_API_KEY=your-api-key       # registry Organizations page, CLI Access
meroctl app publish logic/dist/com.yourorg.myapp-1.0.0.mpk

# list a new package publicly (it is private by default)
meroctl app publish logic/dist/com.yourorg.myapp-1.0.0.mpk --public

# another registry, the key as a flag
meroctl app publish logic/dist/com.yourorg.myapp-1.0.0.mpk \
  --registry https://apps.calimero.network --api-key your-api-key

# as a Calimero Cloud organization, with its ck_live_ key
CALIMERO_REGISTRY_API_KEY=ck_live_... meroctl app publish logic/dist/com.yourorg.myapp-1.0.0.mpk --org my-org
```

`publish` sends the signed manifest and the whole `.mpk` to the registry's
`POST /api/v2/bundles/push`. There is no `--key` on `publish`: the bundle is already signed.

## Full publish workflow

```bash
# 1. Generate a key (one-time) and keep it out of the repo
meroctl app signer new my-key.json
echo "my-key.json" >> .gitignore

# 2. Build + sign + pack
meroctl app pack logic --key my-key.json

# 3. Check, then publish
meroctl app inspect logic/dist/com.yourorg.myapp-0.1.0.mpk
meroctl app publish logic/dist/com.yourorg.myapp-0.1.0.mpk
```

## Updating an existing app (new version)

Bump `[package] version` in `Cargo.toml` (or pass `--app-version`) and re-run with the **same** key,
so the `ApplicationId` stays stable and the node treats the release as an upgrade:

```bash
meroctl app pack logic --key my-key.json --app-version 1.1.0 \
  --previous logic/dist/com.yourorg.myapp-1.0.0.mpk
meroctl app publish logic/dist/com.yourorg.myapp-1.1.0.mpk
```

## Install on a development cluster

A real cluster installs releases from its registry (`meroctl app install PACKAGE@VERSION`). A
development cluster (`meroctl local up`) also takes an upload:

```bash
meroctl local up
meroctl login --dev-passkey ./dev-passkey.json --name ada
meroctl app install --path logic/dist/com.yourorg.myapp-0.1.0.mpk
```

## CI/CD

See `references/ci-auto-publish.md` for the GitHub Actions workflow.
