# CI auto-publish (GitHub Actions)

Publish a new bundle version to the App Registry automatically on every merge to the default branch
that touches the contract.

## How it works

1. The workflow installs `meroctl` from a pinned core release (`MEROCTL_TAG`), checked against the
   release's `SHA256SUMS`: no `cargo install`, nothing compiled but the app.
2. It resolves the **next version from the registry itself** (latest published `appVersion` + patch
   bump), so there are no manual version edits and no drift.
3. `meroctl app pack logic --app-version <resolved> --key <file>` builds the component, writes
   `manifest.json` with a real SHA-256 per artifact, signs it, and writes
   `logic/dist/<package>-<version>.mpk`.
4. `meroctl app publish <mpk>` publishes it.

There is no build script and no separate signing step: step 3 is one command.

## Why one command and not a hand-written manifest

A node install has three hard requirements, and a hand-rolled `manifest.json` breaks them:

- Every artifact carries a **required** lowercase-hex SHA-256 `hash`, which the node recomputes from
  the bytes. A `null` or absent `hash` is malformed and fails at parse time, before the signature is
  even checked.
- Every bundle **must be signed**. There is no unsigned install path.
- `manifest.json` **must be the first member** of the tar. The node's manifest scan is bounded and
  runs before the signature check, so a manifest sitting behind the wasm is never found.

`meroctl app pack` satisfies all three by construction, and `meroctl app inspect` checks a bundle
the way a node does. See `rules/signed-and-hashed.md`.

## Required repository secrets (users set these up themselves)

| Secret                      | What it is                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `CALIMERO_SIGNING_KEY`      | Full JSON content of a signing key file. Generate once with `meroctl app signer new my-key.json` and paste the body.                            |
| `CALIMERO_REGISTRY_API_KEY` | API token from the registry **Organizations** page (CLI Access section), or a Cloud organization's `ck_live_` key when publishing with `--org`. |

```bash
meroctl app signer new my-key.json            # NEVER commit this file
meroctl app signer id my-key.json             # the signerId this key publishes under
gh secret set CALIMERO_SIGNING_KEY < my-key.json
gh secret set CALIMERO_REGISTRY_API_KEY       # paste the token
```

Key rules (see `rules/key-security.md`):

- Sign every version with **the same key**: `ApplicationId = SHA-256(borsh((package, signerId)))`,
  so a different key publishes a different app instead of an upgrade.
- New versions must be signed by the same key that signed the previous version, OR any key if the
  package is linked to an org the API-key owner is a member of.
- Never commit the key file. In CI, materialize it from the secret into an owner-only temp file.
- Never pack without `--key` in CI: the development key is a well-known shared key that the registry
  **refuses**.

## Version resolution (`scripts/resolve-app-version.sh`)

The registry rejects a version that already exists, so the version has to come from the registry.
`GET $REGISTRY_URL/api/v2/bundles?package=<pkg>` is public (no secrets, works in CI and locally) and
returns a flat array of bundle objects with an `appVersion` field: take the max and bump the patch.

```bash
#!/usr/bin/env bash
# Prints the next appVersion on stdout; feeds `meroctl app pack --app-version`.
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
meroctl app pack logic --key my-key.json --app-version "$(scripts/resolve-app-version.sh)"
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

permissions:
  contents: read

env:
  # The core release meroctl comes from. Keep it at or above the calimero-sdk
  # tag in logic/Cargo.toml.
  MEROCTL_TAG: 1.0.0-rc.24
  PACKAGE: com.yourorg.myapp

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 40
    steps:
      - name: Check required secrets
        env:
          CALIMERO_SIGNING_KEY: ${{ secrets.CALIMERO_SIGNING_KEY }}
          CALIMERO_REGISTRY_API_KEY: ${{ secrets.CALIMERO_REGISTRY_API_KEY }}
        run: |
          missing=0
          [ -n "$CALIMERO_SIGNING_KEY" ] || { echo "::error::CALIMERO_SIGNING_KEY secret is not set"; missing=1; }
          [ -n "$CALIMERO_REGISTRY_API_KEY" ] || { echo "::error::CALIMERO_REGISTRY_API_KEY secret is not set"; missing=1; }
          exit $missing

      - uses: actions/checkout@v4

      # `meroctl app build` (run by `app pack`) compiles the crate for wasm32-wasip2.
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: wasm32-wasip2

      # The release's prebuilt binary, checked against its SHA256SUMS: no
      # `cargo install`, no cache to keep. The same shape as
      # calimero-network/apps' scripts/install-meroctl.sh.
      - name: Install meroctl
        run: |
          set -euo pipefail
          T=x86_64-unknown-linux-gnu
          base="https://github.com/calimero-network/core/releases/download/$MEROCTL_TAG"
          dir="$RUNNER_TEMP/meroctl"
          mkdir -p "$dir" && cd "$dir"
          curl -fsSLO --retry 3 "$base/meroctl_$T.tar.gz"
          curl -fsSL --retry 3 "$base/SHA256SUMS" | grep " meroctl_$T.tar.gz\$" | sha256sum -c
          tar -xzf "meroctl_$T.tar.gz" meroctl
          echo "$dir" >> "$GITHUB_PATH"

      - name: Resolve next app version
        id: version
        run: |
          version="$(scripts/resolve-app-version.sh)"
          [ -n "$version" ] || { echo "::error::version resolution produced nothing"; exit 1; }
          echo "Publishing $PACKAGE $version"
          echo "app_version=$version" >> "$GITHUB_OUTPUT"

      - name: Build, sign, and pack the bundle
        env:
          CALIMERO_SIGNING_KEY: ${{ secrets.CALIMERO_SIGNING_KEY }}
          VERSION: ${{ steps.version.outputs.app_version }}
        run: |
          set -euo pipefail
          key="$RUNNER_TEMP/mero-key.json"
          # meroctl refuses a key file group or others can read: write it 0600.
          (umask 077 && printf '%s' "$CALIMERO_SIGNING_KEY" > "$key")
          meroctl app pack logic --package "$PACKAGE" --app-version "$VERSION" \
            --key "$key" --out "dist/$PACKAGE-$VERSION.mpk"
          rm -f "$key"
          meroctl app inspect "dist/$PACKAGE-$VERSION.mpk"

      - name: Publish to App Registry
        env:
          CALIMERO_REGISTRY_API_KEY: ${{ secrets.CALIMERO_REGISTRY_API_KEY }}
          CALIMERO_REGISTRY_URL: https://apps.calimero.network
          VERSION: ${{ steps.version.outputs.app_version }}
        run: meroctl app publish "dist/$PACKAGE-$VERSION.mpk"
```

Prebuilt `meroctl_<target>.tar.gz` assets exist for `x86_64-unknown-linux-gnu`,
`aarch64-unknown-linux-gnu`, and `aarch64-apple-darwin`. On any other platform, build it instead:
`cargo install --locked --git https://github.com/calimero-network/core --tag <tag> meroctl`.

To publish as a Calimero Cloud organization instead, store the organization's `ck_live_` key (scope
`registry:publish`) as `CALIMERO_REGISTRY_API_KEY` and run
`meroctl app publish "dist/$PACKAGE-$VERSION.mpk" --org <org>`; add `--public` to list a new package
publicly.

## Gotchas

- **The secret holds key JSON; `--key` takes a file PATH.** Write the secret to `$RUNNER_TEMP`
  first, owner-only (`umask 077`): `meroctl` refuses a key file that group or others can read. There
  is no `MERO_SIGN_KEY` environment variable any more.
- **Never pack without `--key` in CI.** The development key is a well-known public seed; the
  registry refuses bundles signed with it, and switching to a real key later forks the
  `ApplicationId`.
- **Don't cancel concurrent deploys** - two runs can resolve the same next version; queue them
  (`cancel-in-progress: false`).
- **Version floor**: `FALLBACK_VERSION` only applies when the registry is unreachable or the package
  was never published - pushing a version that already exists is rejected.
- **The `.mpk` filename carries the version**: by default `pack` writes
  `<DIR>/dist/<package>-<version>.mpk`. The template names the file with `--out`, so the publish
  step needs no glob.
- **A frontend is packed only if it is built**: when `[package.metadata.calimero]` names a
  `frontend-dir`, build the frontend before `pack` (or pass `--no-frontend`); a missing directory is
  skipped with a note, not an error.
- **Pin `MEROCTL_TAG`** and move it on purpose: the manifest `pack` writes and the checks it runs
  are that release's.
