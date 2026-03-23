# calimero-rust-sdk — Agent Instructions

You are helping a developer build a **Calimero WASM application** in Rust using the Calimero SDK.

## What you need to know immediately

- Apps compile to WASM and run inside the `merod` node runtime
- All persistent state **must** use Calimero CRDT collections — never `std::collections`
- The `#[app]` macro goes on the **`impl` block**, not the struct
- All `pub` methods on the `#[app]` impl are callable via JSON-RPC from clients
- Events are emitted with `app::emit!()` and pushed to all context members
- Private storage is per-member and isolated; shared state syncs across all members
- There is no `main()` — the SDK provides the entry point

## Cargo.toml setup

> **Version pinning:** always pin to the same git `rev` (or `tag`) as your `merod` binary.
> Run `merod --version` to find the matching commit or release tag. Using
> `branch = "master"` will break when the SDK evolves past your local node.

```toml
[lib]
crate-type = ["cdylib"]

[dependencies]
calimero-sdk     = { git = "https://github.com/calimero-network/core.git", rev = "<same-rev-as-merod>" }
calimero-storage = { git = "https://github.com/calimero-network/core.git", rev = "<same-rev-as-merod>" }

[build-dependencies]
calimero-sdk = { git = "https://github.com/calimero-network/core.git", rev = "<same-rev-as-merod>", features = ["macros"] }

[profile.app-release]
inherits = "release"
codegen-units = 1
opt-level = "z"
lto = true
debug = false
panic = "abort"
overflow-checks = true
```

**Three crates are needed:**

| Crate | Section | Why |
| --- | --- | --- |
| `calimero-sdk` | `[dependencies]` | App macros (`#[app::state]`, `#[app::logic]`), events, env helpers |
| `calimero-storage` | `[dependencies]` | CRDT collections (`UnorderedMap`, `Vector`, `LwwRegister`, etc.) |
| `calimero-sdk` (with `macros` feature) | `[build-dependencies]` | Proc-macro code generation for the WASM ABI |

## Minimal app skeleton

```rust
use calimero_sdk::app;
use calimero_sdk::borsh::{BorshDeserialize, BorshSerialize};
use calimero_storage::collections::UnorderedMap;

#[derive(Default, BorshDeserialize, BorshSerialize)]
pub struct AppState {
    items: UnorderedMap<String, String>,
}

#[app::state]
impl AppState {}

#[app::logic]
impl AppState {
    #[app::init]
    pub fn init() -> AppState {
        AppState::default()
    }

    pub fn set(&mut self, key: String, value: String) -> Result<(), String> {
        self.items.insert(key, value);
        Ok(())
    }

    pub fn get(&self, key: String) -> Option<String> {
        self.items.get(&key).cloned()
    }
}
```

## Building

The standard Calimero app build uses a `build.sh` script with a dedicated release profile
and outputs the `.wasm` file to a `res/` directory:

```bash
#!/bin/bash
set -e

# build.sh — standard Calimero app build script

cd "$(dirname $0)"

TARGET="${CARGO_TARGET_DIR:-../../target}"

rustup target add wasm32-unknown-unknown

cargo build --target wasm32-unknown-unknown --profile app-release

mkdir -p res

cp "$TARGET/wasm32-unknown-unknown/app-release/<crate_name>.wasm" res/

echo "Built: res/<crate_name>.wasm"
```

**Project layout convention:**

```
my-app/
├── logic/
│   ├── Cargo.toml
│   ├── src/
│   │   └── lib.rs
│   └── build.sh
├── res/
│   └── my_app.wasm    (output — install this on the node)
└── .gitignore
```

Manual build without the script:

```bash
# Add WASM target (one-time)
rustup target add wasm32-unknown-unknown

# Build with the app-release profile
cargo build --target wasm32-unknown-unknown --profile app-release

# Output: target/wasm32-unknown-unknown/app-release/<crate_name>.wasm
```

## Installing and running on a node (dev workflow)

```bash
# 1. Install app from WASM file
meroctl --node-url http://localhost:2428 app install \
  --path target/wasm32-unknown-unknown/release/myapp.wasm
# Returns: app-id

# 2. Create a context (instance of the app)
meroctl --node-url http://localhost:2428 context create --app-id <app-id>
# Returns: context-id

# 3. Call a method
meroctl --node-url http://localhost:2428 call <context-id> set \
  --args '{"key":"hello","value":"world"}'

# 4. Call a view
meroctl --node-url http://localhost:2428 call <context-id> get \
  --args '{"key":"hello"}' --view
```

## Key rules

- State struct **must** derive `Default`, `BorshDeserialize`, `BorshSerialize`
- Never use `HashMap`, `Vec`, `BTreeMap` directly for state — use CRDT collections
- No blocking I/O, no threads, no `async` in app logic
- Use `calimero_sdk::env::log!()` not `println!`
- Mutations use `&mut self`, views use `&self`

## Logging

```rust
use calimero_sdk::env;

// Inside any app method:
env::log!("Processing key: {}", key);
```

## .gitignore

When scaffolding a new Calimero app project, always create a `.gitignore` before the first commit:

```gitignore
target/
res/*.wasm
node_modules/
dist/
.DS_Store
```

## References

See `references/` for CRDT collections, events, private storage, and examples.
See `rules/` for hard constraints the compiler won't catch.
