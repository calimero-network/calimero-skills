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

## Crate to add

```toml
[dependencies]
calimero-sdk = { path = "..." }
# or from crates.io once published:
calimero-sdk = "0.x"
```

Also add to `Cargo.toml`:
```toml
[lib]
crate-type = ["cdylib"]
```

## Minimal app skeleton

```rust
use calimero_sdk::app;
use calimero_sdk::borsh::{BorshDeserialize, BorshSerialize};

#[derive(Default, BorshDeserialize, BorshSerialize)]
pub struct AppState {
    // use CRDT collections here
}

#[app::state]
impl AppState {}

#[app::logic]
impl AppState {
    #[app::init]
    pub fn init() -> AppState {
        AppState::default()
    }

    pub fn my_mutation(&mut self, value: String) -> Result<(), String> {
        // mutate state
        Ok(())
    }

    pub fn my_view(&self) -> String {
        // read-only
        String::new()
    }
}
```

## Key rules

- State struct **must** derive `Default`, `BorshDeserialize`, `BorshSerialize`
- Never use `HashMap`, `Vec`, `BTreeMap` directly for state — use CRDT collections
- No blocking I/O, no threads, no `async` in app logic
- Use `calimero_sdk::env::log()` not `println!`

## References

See `references/` for CRDT collections, events, private storage, and examples.
See `rules/` for hard constraints the compiler won't catch.
