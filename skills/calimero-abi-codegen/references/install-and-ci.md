# Installing `mero-app-build`, CI, and breaking-change checks

`mero-app-build` ships prebuilt on every core release for Linux (x86*64, aarch64) and macOS
(aarch64), as
`mero-app-build*<target>.tar.gz`, listed in the release's `SHA256SUMS`. CI that only runs `codegen`
needs no Rust toolchain. Use the release your cluster runs.

```bash
V=1.0.0-rc.19 T=x86_64-unknown-linux-gnu
curl -fsSLO "https://github.com/calimero-network/core/releases/download/$V/mero-app-build_$T.tar.gz"
curl -fsSL "https://github.com/calimero-network/core/releases/download/$V/SHA256SUMS" \
  | grep " mero-app-build_$T.tar.gz\$" | sha256sum -c
tar -xzf "mero-app-build_$T.tar.gz" -C ~/.local/bin mero-app-build
mero-app-build --version
```

From a core checkout, `scripts/install-mero-app-build.sh` builds it instead.

## Regenerate in the build

Generate the client as a build step, from the component you just built, so the client always matches
the app:

```json
{
  "scripts": {
    "codegen": "mero-app-build codegen --abi ../logic/res/abi.json --lang ts --name kv-store --no-openapi -o src/api/kv-store"
  }
}
```

## Check a new version against the last

```bash
mero-app-build abi-diff dist/kv-store-1.0.0.mpk kv-store.wasm   # exits 1 on a breaking change
```

Each side is a `.wasm`, `.mpk` or ABI JSON; `--json` prints the report as JSON.

Breaking: a method removed or renamed, a `kind` changed, a parameter added without `option<..>`, a
result widened, `confirm` added, an error or event removed, a state field removed or changed kind.
Compatible: a method, `option<..>` parameter, error, event or state field added; a result narrowed.
`mero-sign sign --previous <last release>` runs the same check and refuses to sign a release that
changes a state field without bumping `#[app::state(version = N)]`.
