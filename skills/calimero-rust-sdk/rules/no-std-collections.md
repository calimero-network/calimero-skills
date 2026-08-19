# Rule: Never use std collections for state

**WRONG** - rejected at compile time; a `std` collection is not a CRDT, so it cannot be a field of
`#[app::state]`:

```rust,compile_fail
use calimero_sdk::app;
use std::collections::HashMap;

#[app::state]
pub struct AppState {
    data: HashMap<String, String>, // ✗ WRONG
}

#[app::logic]
impl AppState {
    #[app::init]
    pub fn init() -> AppState {
        AppState { data: HashMap::new() }
    }
}
```

**CORRECT** — use Calimero CRDT collections from `calimero_storage::collections`:

```rust
use calimero_sdk::app;
use calimero_storage::collections::{LwwRegister, UnorderedMap};

#[app::state]
pub struct AppState {
    data: UnorderedMap<String, LwwRegister<String>>, // ✓ CORRECT
}

#[app::logic]
impl AppState {
    #[app::init]
    pub fn init() -> AppState {
        AppState { data: UnorderedMap::new() }
    }
}
```

**Import path:** the CRDT collections (`UnorderedMap`, `UnorderedSet`, `Vector`, `Counter`,
`LwwRegister`, `SortedMap`, `SortedSet`, `AuthoredMap`, `AuthoredVector`, `UserStorage`,
`FrozenStorage`, ...) all live in `calimero_storage::collections`. There is no
`calimero_sdk::state::UnorderedMap` — `calimero_sdk::state` only holds the `AppState` trait.

**Why:** `std::collections` types do not participate in the CRDT merge process, so data written to
them by one node would never reach other context members. `#[app::state]` no longer lets that
through: the field is rejected with _"`HashMap` is not allowed here - std collections are not CRDTs
and would silently diverge across replicas"_. A hand-written `Mergeable` impl is the only way to
hold a non-CRDT field, and it still will not converge.

**Applies to:** `HashMap`, `BTreeMap`, `HashSet`, `BTreeSet`, `Vec` (for shared state). `Vec` is
fine for temporary local values inside a method, just not as a field in the state struct.
