# calimero-client-py — Agent Instructions

You are helping a developer use the **Calimero Python client** (`calimero-client-py`) to
interact with a Calimero node from Python — automation scripts, backend services, or CLI tools.

> **NOT this skill** if the developer is building the application logic that runs on the
> node — that is `calimero-rust-sdk` (Rust/WASM) or `calimero-sdk-js` (TypeScript/WASM).
> This skill is for Python code that *calls* the node from outside.

## What it is

`calimero-client-py` is a Python package built with PyO3 (Rust bindings). It provides:
- Full API for managing contexts, applications, identities, blobs, namespaces, and groups
- Automatic JWT token caching and refresh (tokens stored in `~/.merobox/auth_cache/`)
- A CLI for common node operations

> **All methods are synchronous** — the Tokio runtime is managed internally by the Rust
> bindings. Do NOT use `await` with any client methods.

## Install

```bash
pip install calimero-client-py
```

**Build from source (requires Rust 1.70+ and maturin):**
```bash
pip install maturin
git clone https://github.com/calimero-network/calimero-client-py
cd calimero-client-py
maturin develop --release
```

## Minimal working example

```python
import asyncio
from calimero_client_py import create_connection, create_client

def main():
    connection = create_connection(
        api_url="http://localhost:2428",
        node_name="my-local-node"   # must be stable — see rules/
    )
    client = create_client(connection)
    contexts = client.list_contexts()   # no await — methods are synchronous
    print(contexts)

main()
```

## Critical: `node_name` must be stable

`node_name` is used to derive the token cache filename. If it changes between runs,
the client loses its stored tokens and will need to re-authenticate.

## Related skills

- **`calimero-core`** — context/app model and JSON-RPC protocol that the Python client wraps
- **`calimero-merod`** — `merod` daemon setup if the developer is also running the node
- **`calimero-meroctl`** — `meroctl` CLI reference for quick manual operations alongside Python scripts

## References

See `references/` for the full API, authentication flow, and CLI commands.
See `rules/` for the `node_name` stability requirement and sync API usage.
