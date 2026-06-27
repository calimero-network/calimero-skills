# CI Integration

Use Merobox in GitHub Actions (or any CI) to run integration tests against a real multi-node network.
In CI, prefer **`--no-docker`** (native `merod`) so you don't need a Docker daemon in the runner.

## GitHub Actions example

```yaml
# .github/workflows/integration.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install Merobox
        run: pipx install merobox

      - name: Install Rust + wasm target
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: wasm32-unknown-unknown

      - name: Build the app bundle
        run: bash logic/build-bundle.sh   # produces logic/res/<app>-<ver>.mpk

      # Provide a merod binary for --no-docker mode (download a release or build it),
      # then ensure it is on PATH or pass --binary-path below.

      - name: Run the workflow (native merod, no Docker daemon)
        run: merobox bootstrap run --no-docker test/smoke.workflow.yml
```

Notes:

- A workflow file declares its own nodes (`nodes:` map) and cleans up after itself
  (`nuke_on_start` / `nuke_on_end`), so there is **no** separate start/stop/teardown command — the
  single `merobox bootstrap run <file>` brings the network up, runs the steps, asserts, and tears it
  down. (`merobox up/down/status` do not exist.)
- To fail fast on a malformed workflow before spinning up nodes, run
  `merobox bootstrap validate test/smoke.workflow.yml` first.
- Reach a node's API on its **RPC/admin port** (`base_rpc_port + i`, default base 2528) — not the P2P
  port (2428). The smoke workflows use 12428/12528 to avoid colliding with a host-native node.
- If you prefer Docker in CI, drop `--no-docker` and ensure the runner has Docker (GitHub-hosted
  `ubuntu-latest` does); the nodes then use `nodes.image`.

## Reference workflow files

Real, working examples live in this repo's foundation app
(`foundation-app/chat/test/*.workflow.yml`) and in the Battleships repo
(<https://github.com/calimero-network/battleships>).
