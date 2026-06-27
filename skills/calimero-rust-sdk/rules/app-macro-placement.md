# Rule: #[app::state] goes on the struct, #[app::logic] on the impl block

**WRONG** — `#[app::state]` placed on an `impl` (the pre-0.11 mistake); it belongs on the struct:

```rust
#[app::state]   // ✗ this is on an impl — WRONG; #[app::state] must go on the struct
impl AppState {}

#[app::logic]
impl AppState {}
```

**CORRECT:**

```rust
#[app::state(emits = for<'a> Event<'a>)]   // ✓ on the struct (carries emits = ...)
pub struct AppState {
    data: UnorderedMap<String, LwwRegister<String>>,
}

#[app::logic]   // ✓ on the logic impl block
impl AppState {
    #[app::init]
    pub fn init() -> AppState {
        AppState {
            data: UnorderedMap::new(),
        }
    }
}
```

**Why:** `#[app::state]` is a proc macro that operates on the state **struct** (or enum): it injects
the borsh derives, implements `calimero_sdk::state::AppState` (wiring up the declared `emits = ...`
event type), and generates the CRDT merge + registration hooks. `#[app::logic]` is a separate proc
macro that transforms the **impl block** so its public methods become callable entry points. They
are never placed on the same item.

**Also:** `#[app::init]` marks the constructor — called once when the context is created. It must
return the state type, not `Self`. The state struct does **not** derive `Default` and does **not**
hand-write the borsh derives — `#[app::state]` injects `BorshSerialize`/`BorshDeserialize` itself
(see `rules/state-derives.md`).
