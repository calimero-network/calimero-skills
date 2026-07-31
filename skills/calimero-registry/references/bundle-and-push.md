# Bundle & Push

## Install

```bash
# Toolchain: builds, signs, and packs the .mpk
cargo install --git https://github.com/calimero-network/core cargo-mero

# Registry CLI: pushes it
npm install -g @calimero-network/registry-cli
```

`cargo-mero` also ships as a prebuilt `cargo-mero_<target>.tar.gz` on the core releases page.
`cargo mero build` needs the `wasm32-unknown-unknown` target and adds it automatically when `rustup`
is available.

## One-time registry configuration

```bash
calimero-registry config set registry-url https://apps.calimero.network
calimero-registry config set api-key your-api-key
calimero-registry config list
```

Or use environment variables:

```bash
export CALIMERO_REGISTRY_URL=https://apps.calimero.network
export CALIMERO_API_KEY=your-api-key
```

## Build the bundle

```bash
cargo mero bundle --key my-key.json
```

This builds every service, stages the artifacts under `res/bundle-temp/`, writes `manifest.json`
with each artifact's SHA-256, signs it, and tars everything into `dist/<package>.mpk`.

| Flag                    | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| `--key <file>`          | Sign with a production Ed25519 key file                    |
| `--dev`                 | Sign with the dev key: local only, refused by the registry |
| `--app-version <v>`     | Override `appVersion` (defaults to the crate's version)    |
| `--package <id>`        | Override the reverse-DNS package id                        |
| `-o, --output <path>`   | Output path (defaults to `dist/<package>.mpk`)             |
| `--profiling`           | Skip `wasm-opt`, keep debug info                           |
| `--manifest-path`       | Path to the app's `Cargo.toml`                             |
| `--features`            | Cargo features, comma or space separated, repeatable       |
| `--no-default-features` | Disable the crate's default features                       |

Everything else (`package`, `name`, `description`, `author`, `min-runtime-version`, `frontend`,
`services`) comes from `[package.metadata.calimero]` / `[workspace.metadata.calimero]` in
`Cargo.toml`. See the skill's metadata table.

## Push

```bash
# Push to remote registry (uses config file values)
calimero-registry bundle push dist/com.yourorg.myapp.mpk --remote

# Push to local registry
calimero-registry bundle push dist/com.yourorg.myapp.mpk --local

# Override config
calimero-registry bundle push dist/com.yourorg.myapp.mpk \
  --remote \
  --url https://apps.calimero.network \
  --api-key your-api-key
```

## Full publish workflow

```bash
# 1. Generate a key (one-time) and keep it out of the repo
cargo mero key generate -o my-key.json
echo "my-key.json" >> .gitignore

# 2. Build + sign + pack
cargo mero bundle --key my-key.json

# 3. Push
calimero-registry bundle push dist/com.yourorg.myapp.mpk --remote
```

## Updating an existing app (new version)

Bump `[package] version` in `Cargo.toml` (or pass `--app-version`) and re-run with the **same** key,
so the `ApplicationId` stays stable and the node treats the push as an upgrade:

```bash
cargo mero bundle --key my-key.json --app-version 1.1.0
calimero-registry bundle push dist/com.yourorg.myapp.mpk --remote
```

## CI/CD (GitHub Actions)

```yaml
- uses: dtolnay/rust-toolchain@stable
  with:
    targets: wasm32-unknown-unknown

- name: Install cargo-mero
  run: cargo install --git https://github.com/calimero-network/core cargo-mero

- name: Install Registry CLI
  run: npm install -g @calimero-network/registry-cli

- name: Build and sign the bundle
  env:
    MERO_SIGN_KEY_JSON: ${{ secrets.CALIMERO_SIGNING_KEY }}
  run: |
    export MERO_SIGN_KEY="$RUNNER_TEMP/mero-key.json"
    printf '%s' "$MERO_SIGN_KEY_JSON" > "$MERO_SIGN_KEY"
    cargo mero bundle --app-version "${{ github.event.release.tag_name }}"

- name: Publish Bundle
  env:
    CALIMERO_API_KEY: ${{ secrets.CALIMERO_API_KEY }}
  run: calimero-registry bundle push dist/com.yourorg.myapp.mpk --remote
```
