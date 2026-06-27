# Rule: Never use std collections for state

**WRONG** — will compile but state will not sync across context members:

```rust
use std::collections::HashMap;

#[app::state(emits = for<'a> Event<'a>)]
pub struct AppState {
    data: HashMap<String, String>, // ✗ WRONG
}
```

**CORRECT** — use Calimero CRDT collections from `calimero_storage::collections`:

```rust
use calimero_storage::collections::{LwwRegister, UnorderedMap};

#[app::state(emits = for<'a> Event<'a>)]
pub struct AppState {
    data: UnorderedMap<String, LwwRegister<String>>, // ✓ CORRECT
}
```

**Import path:** the CRDT collections (`UnorderedMap`, `UnorderedSet`, `Vector`, `Counter`,
`LwwRegister`, `SortedMap`, `SortedSet`, `AuthoredMap`, `AuthoredVector`, `UserStorage`,
`FrozenStorage`, ...) all live in `calimero_storage::collections`. There is no
`calimero_sdk::state::UnorderedMap` — `calimero_sdk::state` only holds the `AppState` trait.

**Why:** `std::collections` types do not participate in the CRDT merge process. Data written to them
by one node will never reach other context members. The bug is silent — the app compiles and runs
correctly on one node, but state diverges in multi-member contexts.

**Applies to:** `HashMap`, `BTreeMap`, `HashSet`, `BTreeSet`, `Vec` (for shared state). `Vec` is
fine for temporary local values inside a method, just not as a field in the state struct.
