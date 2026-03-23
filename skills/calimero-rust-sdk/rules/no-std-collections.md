# Rule: Never use std collections for state

**WRONG** — will compile but state will not sync across context members:

```rust
use std::collections::HashMap;

#[derive(Default, BorshDeserialize, BorshSerialize)]
pub struct AppState {
    data: HashMap<String, String>, // ✗ WRONG
}
```

**CORRECT** — use Calimero CRDT collections from `calimero_storage`:

```rust
use calimero_storage::collections::UnorderedMap;

#[derive(Default, BorshDeserialize, BorshSerialize)]
pub struct AppState {
    data: UnorderedMap<String, String>, // ✓ CORRECT
}
```

**Why:** `std::collections` types do not participate in the CRDT merge process. Data written to them by one node will never reach other context members. The bug is silent — the app compiles and runs correctly on one node, but state diverges in multi-member contexts.

**Applies to:** `HashMap`, `BTreeMap`, `HashSet`, `BTreeSet`, `Vec` (for shared state). `Vec` is fine for temporary local values inside a method, just not as a field in the state struct.
