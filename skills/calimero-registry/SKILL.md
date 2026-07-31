# calimero-registry — Agent Instructions

You are helping a developer **build and publish a Calimero app bundle** to the App Registry.

## Two tools

| Tool                | Install                                                                   | Purpose                                    |
| ------------------- | ------------------------------------------------------------------------- | ------------------------------------------ |
| `cargo-mero`        | `cargo install --git https://github.com/calimero-network/core cargo-mero` | Builds, signs, and packs the `.mpk` bundle |
| `calimero-registry` | `npm install -g @calimero-network/registry-cli`                           | Pushes the bundle to the registry          |

`cargo-mero` also ships as a prebuilt `cargo-mero_<target>.tar.gz` on the core releases page. It is
a cargo subcommand, so once the binary is on `PATH` you invoke it as `cargo mero`.

## Quick workflow

```bash
# 1. Generate a signing key (one-time)
cargo mero key generate -o my-key.json
echo "my-key.json" >> .gitignore

# 2. Build every service, write + sign manifest.json, pack the bundle
cargo mero bundle --key my-key.json
# -> dist/com.yourorg.myapp.mpk

# 3. Configure the registry (one-time)
calimero-registry config set registry-url https://apps.calimero.network
calimero-registry config set api-key your-api-key

# 4. Push
calimero-registry bundle push dist/com.yourorg.myapp.mpk --remote
```

## Bundle metadata comes from Cargo.toml

`cargo mero bundle` reads `[package.metadata.calimero]` (or `[workspace.metadata.calimero]` for a
multi-service workspace). Keys are kebab-case; the workspace table wins when both are present.

```toml
[package.metadata.calimero]
package = "com.yourorg.myapp"          # required, reverse-DNS
name = "My App"
description = "Does something useful"
author = "Your Name"
min-runtime-version = "0.7.0"
frontend = "https://my-app.com"        # Desktop opens this URL
```

| `Cargo.toml` key      | `manifest.json` field  | Default                      |
| --------------------- | ---------------------- | ---------------------------- |
| `package`             | `package`              | required                     |
| `name`                | `metadata.name`        | the crate name               |
| `description`         | `metadata.description` | omitted                      |
| `author`              | `metadata.author`      | omitted                      |
| `min-runtime-version` | `minRuntimeVersion`    | `0.1.0`                      |
| `frontend`            | `links.frontend`       | omitted                      |
| `services`            | `services[]`           | empty (workspace table only) |

The app version is not a metadata key: it defaults to the crate's `[package] version` and is
overridable with `--app-version`.

## Bundle flags

| Flag                    | Description                                                               |
| ----------------------- | ------------------------------------------------------------------------- |
| `--key <file>`          | Sign with a production Ed25519 key file                                   |
| `--dev`                 | Sign with the well-known dev key: local only, **refused by the registry** |
| `--app-version`         | Override the `appVersion` recorded in `manifest.json`                     |
| `--package`             | Override the reverse-DNS package id                                       |
| `-o, --output`          | Output path for the `.mpk` (defaults to `dist/<package>.mpk`)             |
| `--profiling`           | Skip `wasm-opt`, keep debug info                                          |
| `--features`            | Cargo features, comma or space separated, repeatable                      |
| `--no-default-features` | Disable the crate's default features                                      |

With neither `--key` nor `--dev`, `bundle` reads the `MERO_SIGN_KEY` environment variable as the
path to a key file. That is the CI-friendly form: materialize the key from a secret, export the
variable, run `cargo mero bundle`.

## Signing is mandatory

There is no unsigned install path. A bundle is signed as part of packaging, and the node verifies
both the signature and every artifact's SHA-256 before installing. See `rules/signed-and-hashed.md`.

Your signing key is half of your app's on-node identity
(`ApplicationId = SHA-256(borsh((package, signerId)))`), so signing every release with the same key
is what makes the next release an upgrade rather than a new app. See `references/signing.md`.

## Bundle push flags

```bash
# Push to local registry (default)
calimero-registry bundle push dist/com.yourorg.myapp.mpk --local

# Push to remote registry (uses config file)
calimero-registry bundle push dist/com.yourorg.myapp.mpk --remote

# Override config with flags
calimero-registry bundle push dist/com.yourorg.myapp.mpk \
  --remote \
  --url https://apps.calimero.network \
  --api-key your-api-key
```

## Configuration

```bash
# Set defaults (stored in ~/.calimero-registry/remote-config.json)
calimero-registry config set registry-url https://apps.calimero.network
calimero-registry config set api-key your-api-key
calimero-registry config list

# Or use environment variables
export CALIMERO_REGISTRY_URL=https://apps.calimero.network
export CALIMERO_API_KEY=your-api-key
```

## Package naming rules

- Must be reverse-domain format: `com.yourorg.appname`
- Version must be SemVer without `v` prefix: `1.0.0` not `v1.0.0`

## Updating an existing app (new version)

Bump `[package] version` in `Cargo.toml` (or pass `--app-version`), then rebuild and push with the
**same** key - the signer is half the application id, so a different key publishes a different app.

```bash
cargo mero bundle --key my-key.json --app-version 1.1.0
calimero-registry bundle push dist/com.yourorg.myapp.mpk --remote
```

## CI auto-publish

Publish a new version automatically on every merge to the default branch that touches the contract:
resolve the next version **from the registry itself** (latest published `appVersion` + patch bump),
pass it to `cargo mero bundle --app-version`, and push the `.mpk`. Users provide their own two
secrets: `CALIMERO_SIGNING_KEY` (generate with `cargo mero key generate`) and
`CALIMERO_REGISTRY_API_KEY` (registry Organizations page). Full workflow template,
version-resolution snippet, and gotchas (registry-cli needs Node ≥ 24; queue - don't cancel -
concurrent deploys): see `references/ci-auto-publish.md`.

## Related skills

- **`calimero-rust-sdk`** — building the WASM app that gets published
- **`calimero-core`** — application/context model and how the registry integrates with node app
  install

## References

See `references/` for manifest format, signing details, and push workflow. See `rules/` for hard
constraints.
