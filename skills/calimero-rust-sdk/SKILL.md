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

```toml
[lib]
crate-type = ["cdylib"]

[dependencies]
calimero-sdk = "0.x"
```

## Minimal app skeleton

```rust
use calimero_sdk::app;
use calimero_sdk::borsh::{BorshDeserialize, BorshSerialize};
use calimero_sdk::state::UnorderedMap;

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

```bash
# Add WASM target (one-time)
rustup target add wasm32-unknown-unknown

# Build
cargo build --target wasm32-unknown-unknown --release

# Output: target/wasm32-unknown-unknown/release/<crate_name>.wasm
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

## References

See `references/` for CRDT collections, events, private storage, and examples.
See `rules/` for hard constraints the compiler won't catch.
