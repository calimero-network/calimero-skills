# CRDT State Collections

Calimero provides conflict-free replicated data types for application state. All collections are
imported from `calimero_storage::collections`.

> **Critical:** Do NOT use `calimero_sdk::state::*` — that path no longer exists. The correct import
> is `calimero_storage::collections::*`.

## Available Collections

| Type                      | Use for                                 | Notes                                              |
| ------------------------- | --------------------------------------- | -------------------------------------------------- |
| `UnorderedMap<K, V>`      | Key-value mapping                       | Most collection ops return `Result<>` — use `?`    |
| `UnorderedSet<T>`         | Unique value set                        |                                                    |
| `Vector<T>`               | Ordered list (append-only)              |                                                    |
| `LwwRegister<T>`          | Single last-write-wins value            | Wrap map values: `UnorderedMap<K, LwwRegister<V>>` |
| `Counter`                 | Grow-only counter (GCounter by default) | `.increment()`, `.value()`                         |
| `Counter<true>`           | PN-Counter (supports decrement)         | Same API + `.decrement()`                          |
| `FrozenStorage<T>`        | Immutable content-addressed entries     |                                                    |
| `UserStorage<T>`          | Per-member isolated storage             | Not synced to other members                        |
| `ReplicatedGrowableArray` | CRDT text / ordered sequence            | Collaborative editing                              |

## Import

```rust
use calimero_storage::collections::{
    Counter, FrozenStorage, LwwRegister, ReplicatedGrowableArray,
    UnorderedMap, UnorderedSet, UserStorage, Vector,
};
```

## Usage

```rust
use calimero_sdk::app;
use calimero_sdk::borsh::{BorshDeserialize, BorshSerialize};
use calimero_storage::collections::{LwwRegister, UnorderedMap, Vector, Counter};

#[app::state]
#[derive(Debug, BorshSerialize, BorshDeserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
pub struct AppState {
    // Map values wrapped in LwwRegister for CRDT merge
    items:   UnorderedMap<String, LwwRegister<String>>,
    log:     Vector<String>,
    counter: Counter,
}

#[app::logic]
impl AppState {
    pub fn set(&mut self, key: String, value: String) -> app::Result<()> {
        self.items.insert(key, value.into())?;
        Ok(())
    }

    pub fn get(&self, key: &str) -> app::Result<Option<String>> {
        Ok(self.items.get(key)?.map(|v| v.get().clone()))
    }

    pub fn append(&mut self, entry: String) -> app::Result<()> {
        self.log.push(entry)?;
        Ok(())
    }

    pub fn increment(&mut self) -> app::Result<()> {
        self.counter.increment()?;
        Ok(())
    }
}
```

## UnorderedMap patterns

```rust
// Insert
self.items.insert(key, value.into())?;

// Get (returns Option<LwwRegister<V>>)
let val = self.items.get(&key)?.map(|v| v.get().clone());

// Contains
let exists = self.items.contains(&key)?;

// Remove
let old = self.items.remove(&key)?;

// All entries
let all: Vec<(K, V)> = self.items.entries()?.collect();

// In-place mutation via guard
if let Some(mut guard) = self.items.get_mut(&key)? {
    guard.set(new_value);
}

// Entry API (like HashMap::entry)
use calimero_storage::collections::unordered_map::Entry;
let entry = self.items.entry(key)?;
let val = entry.or_insert(LwwRegister::new(default_value))?;

// Length
let n = self.items.len()?;

// Clear
self.items.clear()?;
```

## Constructor

Collections must be initialized with `::new()` — there is no Default impl:

```rust
#[app::init]
pub fn init() -> AppState {
    AppState {
        items:   UnorderedMap::new(),
        log:     Vector::new(),
        counter: Counter::new(),
    }
}
```

## Keys and values must implement

- `BorshSerialize + BorshDeserialize`
- Values in UnorderedMap are typically wrapped in `LwwRegister<V>` — this handles conflict
  resolution automatically

## Important

CRDT collections handle concurrent writes from different context members automatically — you never
need to manually resolve conflicts. Writes from different members are merged deterministically using
the DAG-based sync engine.

Collection operations are **fallible** — always propagate errors with `?`. Panicking inside a WASM
method aborts the execution and rolls back state.
