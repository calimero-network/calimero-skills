# CI auto-publish (GitHub Actions)

Publish a new bundle version to the App Registry automatically on every merge to the default branch
that touches the contract. Proven in production by `calimero-network/mero-chat`, `mero-blocks`, and
`merraria`.

## How it works

1. A `build-bundle.sh` script builds the WASM, resolves the **next version from the registry
   itself** (latest published `appVersion` + patch bump — no manual version edits, no drift), writes
   `manifest.json`, signs it with `mero-sign`, and tars everything into an `.mpk`.
2. A `deploy-bundle.yml` workflow runs that script on pushes to the default branch that touch
   `logic/**`, then pushes the `.mpk` with `calimero-registry bundle push --remote`.

## Required repository secrets (users set these up themselves)

| Secret                      | What it is                                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MERO_SIGN_KEY`             | Full JSON content of a `mero-sign` key file (`{private_key, public_key, signer_id}`). Generate once with `mero-sign generate-key --output my-key.json` and paste the file body. |
| `CALIMERO_REGISTRY_API_KEY` | API token from the registry **Organizations** page (CLI Access section).                                                                                                        |

```bash
mero-sign generate-key --output my-key.json   # NEVER commit this file
gh secret set MERO_SIGN_KEY < my-key.json
gh secret set CALIMERO_REGISTRY_API_KEY       # paste the token
```

Key rules (see `rules/key-security.md`):

- New versions must be signed by **the same key that signed the previous version**, OR any key if
  the package is linked to an org the API-key owner is a member of.
- The key file must never be committed — sign in CI from the secret written to a temp file.

## Version resolution snippet (build-bundle.sh)

The registry GET is public, so version resolution needs no secrets and works in CI and locally:

```bash
PACKAGE="com.yourorg.myapp"
FALLBACK_VERSION="0.1.0"   # used only when the registry is unreachable / package unpublished
REGISTRY_URL="${REGISTRY_URL:-https://apps.calimero.network}"

resolve_app_version() {
  if [ -n "${APP_VERSION_OVERRIDE:-}" ]; then echo "$APP_VERSION_OVERRIDE"; return; fi
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
}
```

Signing key precedence inside the script — CI secret first, local dev key as fallback:

```bash
SIGN_KEY="${MERO_SIGN_KEY_FILE:-./my-key.json}"   # my-key.json is gitignored
[ -f "$SIGN_KEY" ] || { echo "ERROR: no signing key (set MERO_SIGN_KEY_FILE or create my-key.json)" >&2; exit 1; }
mero-sign sign res/bundle-temp/manifest.json --key "$SIGN_KEY"
```

## Workflow template

```yaml
name: Deploy Bundle

on:
  push:
    branches: [main] # or master — your default branch
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
  MERO_SIGN_REF: 0.11.0-rc.13

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 40
    steps:
      - name: Check required secrets
        env:
          MERO_SIGN_KEY: ${{ secrets.MERO_SIGN_KEY }}
          CALIMERO_REGISTRY_API_KEY: ${{ secrets.CALIMERO_REGISTRY_API_KEY }}
        run: |
          missing=0
          [ -n "$MERO_SIGN_KEY" ] || { echo "::error::MERO_SIGN_KEY secret is not set"; missing=1; }
          [ -n "$CALIMERO_REGISTRY_API_KEY" ] || { echo "::error::CALIMERO_REGISTRY_API_KEY secret is not set"; missing=1; }
          exit $missing

      - uses: actions/checkout@v7

      - name: Install Rust
        uses: dtolnay/rust-toolchain@master
        with:
          toolchain: '1.89.0'
          targets: wasm32-unknown-unknown

      - name: Install wasm-opt
        run: sudo apt-get update -q && sudo apt-get install -y -q binaryen

      - name: Cache mero-sign
        id: cache-mero-sign
        uses: actions/cache@v6
        with:
          path: ~/.cargo/bin/mero-sign
          key: mero-sign-${{ runner.os }}-${{ env.MERO_SIGN_REF }}

      # crates.io lags core releases — install from the core repo by tag for a current, pinned build
      - name: Install mero-sign
        if: steps.cache-mero-sign.outputs.cache-hit != 'true'
        run: |
          cargo install mero-sign --locked \
            --git https://github.com/calimero-network/core \
            --tag "$MERO_SIGN_REF"

      - name: Write signing key
        env:
          MERO_SIGN_KEY: ${{ secrets.MERO_SIGN_KEY }}
        run: printf '%s' "$MERO_SIGN_KEY" > "$RUNNER_TEMP/mero-sign-key.json"

      - name: Build & sign bundle
        env:
          MERO_SIGN_KEY_FILE: ${{ runner.temp }}/mero-sign-key.json
        run: ./logic/build-bundle.sh

      # registry-cli >=1.15 requires node >= 24; the ubuntu runner default is 20
      - name: Set up Node 24
        uses: actions/setup-node@v4
        with:
          node-version: '24'

      - name: Install calimero-registry CLI
        run: npm install -g @calimero-network/registry-cli

      - name: Publish to App Registry
        env:
          CALIMERO_API_KEY: ${{ secrets.CALIMERO_REGISTRY_API_KEY }}
          CALIMERO_REGISTRY_URL: https://apps.calimero.network
        run: |
          shopt -s nullglob
          mpks=(logic/res/myapp-*.mpk)
          if [ ${#mpks[@]} -ne 1 ]; then
            echo "::error::expected exactly one .mpk in logic/res, found: ${mpks[*]:-none}"
            exit 1
          fi
          calimero-registry bundle push "${mpks[0]}" --remote
```

## Gotchas

- **Node ≥ 24**: `@calimero-network/registry-cli@1.15+` fails to install on the runner default
  (Node 20) — always add the `setup-node` step before `npm install -g`.
- **mero-sign on crates.io lags core releases** (`0.11.0-rc.4` at time of writing vs core at
  `rc.13`+) — in CI, install it from the core repo with `--git` + `--tag` for a current,
  reproducible build; cache the binary keyed on the tag.
- **Don't cancel concurrent deploys** — two runs can resolve the same next version; queue them
  (`cancel-in-progress: false`).
- **Version floor**: `FALLBACK_VERSION` only applies when the registry is unreachable or the package
  was never published — pushing a version that already exists is rejected.
- **Pinned override**: `APP_VERSION_OVERRIDE=x.y.z ./logic/build-bundle.sh` for migration bundles or
  explicit pins.

## Full working examples

- `calimero-network/mero-chat` — `logic/build-bundle.sh` + `.github/workflows/deploy-bundle.yml`
- `calimero-network/mero-blocks`, `calimero-network/merraria` — same pattern with `make bundle` /
  `make publish` wrappers
