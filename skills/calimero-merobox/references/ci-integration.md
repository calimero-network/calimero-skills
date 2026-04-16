# CI Integration

Use Merobox in GitHub Actions or other CI systems to run integration tests against a real multi-node
network.

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

      - name: Build app
        run: cargo build --target wasm32-unknown-unknown --release

      - name: Start network
        run: merobox up --workflow workflows/test-network.yml --setup

      - name: Run tests
        run: npm test
        env:
          NODE_URL: http://localhost:2428

      - name: Tear down
        if: always()
        run: merobox down --purge
```

## Reference workflow files

The Battleships repo has well-structured workflow examples:
https://github.com/calimero-network/battleships/tree/main/workflows
