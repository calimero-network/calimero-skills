# Rule: #[app] macro goes on the impl block, not the struct

**WRONG:**

```rust
#[app::state]  // ✗ WRONG placement
pub struct AppState {
    data: UnorderedMap<String, String>,
}
```

**CORRECT:**

```rust
#[derive(Default, BorshDeserialize, BorshSerialize)]
pub struct AppState {
    data: UnorderedMap<String, String>,
}

#[app::state]   // ✓ on the impl block
impl AppState {}

#[app::logic]   // ✓ on the logic impl block
impl AppState {
    #[app::init]
    pub fn init() -> AppState {
        AppState::default()
    }
}
```

**Why:** `#[app::state]` and `#[app::logic]` are proc macros that transform impl blocks to register the type with the SDK runtime. The struct itself only needs the derive macros (`Default`, `BorshDeserialize`, `BorshSerialize`).

**Also:** `#[app::init]` marks the constructor — called once when the context is created. It must return the state type, not `Self`.
