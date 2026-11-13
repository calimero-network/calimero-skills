# Installing `meroctl`, CI, and breaking-change checks

`meroctl` is core's one command line. Every core release ships it prebuilt for Linux (`x86_64`,
`aarch64`) and macOS (`aarch64`) as `meroctl_<target>.tar.gz`, listed in the release's `SHA256SUMS`,
so CI that only runs `codegen` needs no Rust toolchain. `meroctl --version` names the release it
came from. Use the release your cluster runs; `app codegen` is in `meroctl` from core 1.0.0-rc.24.

Core's installer downloads a release, checks it against `SHA256SUMS` and puts the binary in
`~/.local/bin` (or `CALIMERO_INSTALL_DIR`, or `--dir DIR`). It replaces the `install-sh`
repository's scripts and core's `scripts/install-mero-app-build.sh`.

```bash
# the newest release (release candidates included)
curl -fsSL https://raw.githubusercontent.com/calimero-network/core/master/scripts/install.sh | sh

# a pinned release
curl -fsSL https://raw.githubusercontent.com/calimero-network/core/master/scripts/install.sh \
  | sh -s -- meroctl --version 1.0.0-rc.24
meroctl --version
```

Or by hand, which is what a CI step does:

```bash
V=1.0.0-rc.24 T=x86_64-unknown-linux-gnu   # the core release, and this machine's target
curl -fsSLO "https://github.com/calimero-network/core/releases/download/$V/meroctl_$T.tar.gz"
curl -fsSL "https://github.com/calimero-network/core/releases/download/$V/SHA256SUMS" \
  | grep " meroctl_$T.tar.gz\$" | sha256sum -c
tar -xzf "meroctl_$T.tar.gz" -C ~/.local/bin meroctl
```

From a core checkout, `cargo install --locked --path crates/meroctl` builds it instead.

## Regenerate in the build

Generate the client as a build step, from the app's committed ABI or the component you just built,
so the client always matches the app:

```json
{
  "scripts": {
    "codegen": "meroctl app codegen --abi ../logic/res/abi.json --lang ts --name kv-store --no-openapi -o src/api/kv-store"
  }
}
```

In CI, pin the release in one place, install it, run every `codegen` and fail on a diff. This is the
shape calimero-network/apps uses (`scripts/install-meroctl.sh`, pinned by `MEROCTL_TAG`):

```yaml
- name: Install meroctl
  env:
    MEROCTL_TAG: 1.0.0-rc.24
  run: |
    T=x86_64-unknown-linux-gnu
    base="https://github.com/calimero-network/core/releases/download/$MEROCTL_TAG"
    mkdir -p "$RUNNER_TEMP/meroctl" && cd "$RUNNER_TEMP/meroctl"
    curl -fsSLO --retry 3 "$base/meroctl_$T.tar.gz"
    curl -fsSL --retry 3 "$base/SHA256SUMS" | grep " meroctl_$T.tar.gz\$" | sha256sum -c
    tar -xzf "meroctl_$T.tar.gz" meroctl
    echo "$RUNNER_TEMP/meroctl" >> "$GITHUB_PATH"

- name: Assert the generated client is current
  run: |
    pnpm run codegen
    git diff --exit-code -- src/api
```

## Check a new version against the last

```bash
meroctl app abi diff dist/com.example.kv-store-1.0.0.mpk kv-store.wasm   # exits 1 on a breaking change
meroctl app abi show kv-store.wasm                                       # one ABI, as JSON
```

Each side is a component, an `.mpk` or ABI JSON; `--json` prints the report as JSON and
`--service <name>` picks one service of a multi-service bundle.

Breaking: a method removed or renamed, a `kind` changed, a parameter added without `option<..>`, a
result widened, `confirm` added, an error or event removed, a state field removed or changed kind.
Compatible: a method, `option<..>` parameter, error, event or state field added; a result narrowed.
`meroctl app pack --previous <last release>` and `meroctl app sign --previous <last release>` run
the same check, and refuse to sign a release that changes a state field without bumping
`#[app::state(version = N)]`.
