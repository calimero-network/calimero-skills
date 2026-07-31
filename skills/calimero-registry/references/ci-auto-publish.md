# CI auto-publish (GitHub Actions)

Publish a new bundle version to the App Registry automatically on every merge to the default branch
that touches the contract.

## How it works

1. The workflow resolves the **next version from the registry itself** (latest published
   `appVersion` + patch bump), so there are no manual version edits and no drift.
2. `cargo mero bundle --app-version <resolved>` builds every service, stages the artifacts, writes
   `manifest.json` with a real SHA-256 per artifact, signs it, and tars `dist/<package>.mpk`.
3. `calimero-registry bundle push dist/<package>.mpk --remote` publishes it.

There is no build script and no separate signing step: step 2 is one command.

## Why one command and not a hand-written manifest

A node install has three hard requirements, and a hand-rolled `manifest.json` breaks them:

- Every artifact carries a **required** lowercase-hex SHA-256 `hash`, which the node recomputes from
  the bytes. A `null` or absent `hash` is malformed and fails at parse time, before the signature is
  even checked.
- Every bundle **must be signed**. There is no unsigned install path.
- `manifest.json` **must be the first member** of the tar. The node's manifest scan is bounded and
  runs before the signature check, so a manifest sitting behind the wasm is never found.

`cargo mero bundle` satisfies all three by construction. See `rules/signed-and-hashed.md`.

## Required repository secrets (users set these up themselves)

| Secret                      | What it is                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `CALIMERO_SIGNING_KEY`      | Full JSON content of a signing key file. Generate once with `cargo mero key generate --output my-key.json` and paste the body. |
| `CALIMERO_REGISTRY_API_KEY` | API token from the registry **Organizations** page (CLI Access section).                                                       |

```bash
cargo mero key generate --output my-key.json     # NEVER commit this file
cargo mero key derive-signer-id --key my-key.json # the signerId this key publishes under
gh secret set CALIMERO_SIGNING_KEY < my-key.json
gh secret set CALIMERO_REGISTRY_API_KEY          # paste the token
```

Key rules (see `rules/key-security.md`):

- Sign every version with **the same key**: `ApplicationId = SHA-256(borsh((package, signerId)))`,
  so a different key publishes a different app instead of an upgrade.
- New versions must be signed by the same key that signed the previous version, OR any key if the
  package is linked to an org the API-key owner is a member of.
- Never commit the key file. In CI, materialize it from the secret into a temp file.
- Never use `--dev` in CI: it signs with a well-known shared key that the registry **refuses**.

## Version resolution (`scripts/resolve-app-version.sh`)

The registry rejects a version that already exists, so the version has to come from the registry.
`GET $REGISTRY_URL/api/v2/bundles?package=<pkg>` is public (no secrets, works in CI and locally) and
returns a flat array of bundle objects with an `appVersion` field: take the max and bump the patch.

```bash
#!/usr/bin/env bash
# Prints the next appVersion on stdout; feeds `cargo mero bundle --app-version`.
set -euo pipefail

PACKAGE="com.yourorg.myapp"
FALLBACK_VERSION="0.1.0" # used only when the registry is unreachable / package unpublished
REGISTRY_URL="${REGISTRY_URL:-https://apps.calimero.network}"

if [ -n "${APP_VERSION_OVERRIDE:-}" ]; then echo "$APP_VERSION_OVERRIDE"; exit 0; fi

curl -fsS -m 15 "${REGISTRY_URL}/api/v2/bundles?package=${PACKAGE}" 2>/dev/null \
  | PKG_FALLBACK="$FALLBACK_VERSION" python3 -c '
import sys, os, json
fb = os.environ["PKG_FALLBACK"]
def key(v):
    out = []
    for part in str(v).split(".")[:3]:
        digits = "".join(c for c in part if c.isdigit())
        out.append(int(digits) if digits else 0)
    while len(out) < 3: out.append(0)
    return tuple(out)
try:
    data = json.load(sys.stdin)
    vers = [b.get("appVersion") for b in data if isinstance(b, dict) and b.get("appVersion")]
    if not vers:
        print(fb); sys.exit(0)
    a, b, c = key(max(vers, key=key))
    print(f"{a}.{b}.{c + 1}")
except Exception:
    print(fb)
' 2>/dev/null || echo "$FALLBACK_VERSION"
```

The same script drives a manual publish, so CI and a laptop pick versions identically:

```bash
cargo mero bundle --key my-key.json --app-version "$(scripts/resolve-app-version.sh)"
```

`APP_VERSION_OVERRIDE=x.y.z` pins an explicit version instead, for a migration bundle or a
deliberate minor/major bump.

## Workflow template

```yaml
name: Deploy Bundle

on:
  push:
    branches: [main] # or master - your default branch
    paths:
      - 'logic/**'
  workflow_dispatch:

# Queue deploys instead of cancelling: each run resolves its version from the
# registry, so concurrent runs could race to the same version number.
concurrency:
  group: deploy-bundle
  cancel-in-progress: false

env:
  # Keep in sync with the calimero-sdk tag in logic/Cargo.toml
  CARGO_MERO_VERSION: 0.11.0-rc.19
  PACKAGE: com.yourorg.myapp

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 40
    steps:
      - name: Check required secrets
        env:
          MERO_SIGN_KEY_JSON: ${{ secrets.CALIMERO_SIGNING_KEY }}
          CALIMERO_REGISTRY_API_KEY: ${{ secrets.CALIMERO_REGISTRY_API_KEY }}
        run: |
          missing=0
          [ -n "$MERO_SIGN_KEY_JSON" ] || { echo "::error::CALIMERO_SIGNING_KEY secret is not set"; missing=1; }
          [ -n "$CALIMERO_REGISTRY_API_KEY" ] || { echo "::error::CALIMERO_REGISTRY_API_KEY secret is not set"; missing=1; }
          exit $missing

      - uses: actions/checkout@v7

      - name: Install Rust
        uses: dtolnay/rust-toolchain@master
        with:
          toolchain: '1.89.0'
          targets: wasm32-unknown-unknown

      # Prebuilt release asset, not `cargo install`: no compile, no cache to keep.
      # wasm-opt is compiled into the binary, so binaryen is not needed either.
      - name: Install cargo-mero
        run: |
          mkdir -p "$HOME/.cargo/bin"
          curl -fsSL "https://github.com/calimero-network/core/releases/download/${CARGO_MERO_VERSION}/cargo-mero_x86_64-unknown-linux-gnu.tar.gz" \
            | tar -xzf - -C "$HOME/.cargo/bin"
          cargo mero --version

      - name: Resolve next app version
        id: version
        run: |
          version="$(scripts/resolve-app-version.sh)"
          [ -n "$version" ] || { echo "::error::version resolution produced nothing"; exit 1; }
          echo "Publishing $PACKAGE $version"
          echo "app_version=$version" >> "$GITHUB_OUTPUT"

      - name: Build, sign, and pack the bundle
        env:
          MERO_SIGN_KEY_JSON: ${{ secrets.CALIMERO_SIGNING_KEY }}
        run: |
          export MERO_SIGN_KEY="$RUNNER_TEMP/mero-key.json"
          printf '%s' "$MERO_SIGN_KEY_JSON" > "$MERO_SIGN_KEY"
          cargo mero bundle \
            --manifest-path logic/Cargo.toml \
            --app-version "${{ steps.version.outputs.app_version }}"

      # registry-cli declares engines.node >= 24 - pin it explicitly rather than
      # relying on whatever the runner image happens to ship
      - name: Set up Node 24
        uses: actions/setup-node@v7
        with:
          node-version: '24'

      - name: Install calimero-registry CLI
        run: npm install -g @calimero-network/registry-cli

      - name: Publish to App Registry
        env:
          CALIMERO_API_KEY: ${{ secrets.CALIMERO_REGISTRY_API_KEY }}
          CALIMERO_REGISTRY_URL: https://apps.calimero.network
        run: calimero-registry bundle push "logic/dist/$PACKAGE.mpk" --remote
```

Prebuilt `cargo-mero_<target>.tar.gz` assets exist for `x86_64-unknown-linux-gnu`,
`aarch64-unknown-linux-gnu`, and `aarch64-apple-darwin`. On any other platform, build it instead:
`cargo install --git https://github.com/calimero-network/core --tag <tag> cargo-mero`.

## Gotchas

- **The secret holds key JSON; the `MERO_SIGN_KEY` variable holds a key file PATH.** Wiring the
  secret straight into `env: MERO_SIGN_KEY` makes `cargo mero bundle` open the JSON blob as a
  filename. Write it to `$RUNNER_TEMP` first and point the variable at that file.
- **Never `--dev` in CI.** The dev key is a well-known public seed; the registry refuses bundles
  signed with it, and switching to a real key later forks the `ApplicationId`.
- **Node ≥ 24**: `@calimero-network/registry-cli` declares `engines.node >= 24` and fails to install
  on older runtimes - add an explicit `setup-node` step before `npm install -g` instead of trusting
  the runner image default.
- **Don't cancel concurrent deploys** - two runs can resolve the same next version; queue them
  (`cancel-in-progress: false`).
- **Version floor**: `FALLBACK_VERSION` only applies when the registry is unreachable or the package
  was never published - pushing a version that already exists is rejected.
- **The `.mpk` filename carries no version**: the default output is `dist/<package>.mpk` and the
  version lives inside the manifest, so the publish step names the file directly and needs no glob.
- **`dist/` sits next to the manifest you point at**, not next to the repo root, so a contract at
  `logic/Cargo.toml` produces `logic/dist/<package>.mpk`. `--output <path>` overrides it verbatim.
