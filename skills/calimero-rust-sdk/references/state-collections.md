# CRDT State Collections

Calimero provides conflict-free replicated data types for application state. All collections are
imported from `calimero_storage::collections`.

> **Critical:** Do NOT use `calimero_sdk::state::*` — that path no longer exists. The correct import
> is `calimero_storage::collections::*`.

## Available Collections

| Type                      | Use for                                 | Notes                                                      |
| ------------------------- | --------------------------------------- | ---------------------------------------------------------- |
| `UnorderedMap<K, V>`      | Key-value mapping                       | Most collection ops return `Result<>` — use `?`            |
| `UnorderedSet<T>`         | Unique value set                        |                                                            |
| `Vector<T>`               | Ordered list (append-only)              |                                                            |
| `LwwRegister<T>`          | Single last-write-wins value            | Wrap map values: `UnorderedMap<K, LwwRegister<V>>`         |
| `Counter`                 | Grow-only counter (GCounter by default) | `.increment()`, `.value()`                                 |
| `Counter<true>`           | PN-Counter (supports decrement)         | Same API + `.decrement()`                                  |
| `FrozenStorage<T>`        | Immutable content-addressed entries     |                                                            |
| `UserStorage<T>`          | Per-member isolated storage             | Not synced to other members                                |
| `ReplicatedGrowableArray` | CRDT text / ordered sequence            | Collaborative editing                                      |
| `SortedMap<K, V>`         | Key-value mapping with ordered keys     | Supports range / prefix / paged queries                    |
| `SortedSet<T>`            | Ordered unique value set                | Range / prefix / paged iteration                           |
| `AuthoredMap<K, V>`       | Per-entry ownership                     | Only an entry's author can modify it (no spoofing)         |
| `AuthoredVector<T>`       | Per-slot ownership                      | Only a slot's author can modify it                         |
| `SharedStorage<T>`        | Group-writable value (writer set)       | Explicit writer set; prefer over `UnorderedMap` + max-wins |

> **0.11 additions:** the ordered collections `SortedMap` and `SortedSet` (range/prefix/paged
> queries); the authored collections `AuthoredMap` and `AuthoredVector` (per-entry/slot author
> ownership — prefer these over `UnorderedMap` + a hand-rolled max-wins `Mergeable` when "only the
> author may edit their own data"); and `SharedStorage<T>` (a group-writable value gated by a writer
> set — `SharedStorage::new(writers, frozen)`, alias of `PermissionedStorage<T, WriterSetAcl>`).
> Canonical usage lives in `core/apps/`: `sorted-kv-store`, `sorted-set-store`,
> `kv-store-with-shared-storage`, and `scaffolding-e2e` (exercises all of them).

## Import

```rust
use calimero_storage::collections::{
    Counter, FrozenStorage, LwwRegister, ReplicatedGrowableArray,
    UnorderedMap, UnorderedSet, UserStorage, Vector,
    // 0.11 additions:
    SortedMap, SortedSet, AuthoredMap, AuthoredVector, SharedStorage,
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

// Length
let n = self.items.len()?;

// Clear
self.items.clear()?;
```

## Mutating a value in place

`get_mut` returns a `ValueMut` guard. **The guard writes the value back to storage
when it drops, and holds a mutable borrow of the entire collection until then.**
Use it only for the pure "mutate if present, nothing else touches this collection"
case - the guard must not overlap ANY other use of the same collection (a `get`,
an `insert`, an `entries`, etc.).

```rust
// OK: `guard` is the only thing touching `self.items` in its scope.
if let Some(mut guard) = self.items.get_mut(&key)? {
    guard.set(new_value); // written back to storage when `guard` drops
}
```

The write-back is the same Update action as `insert`, so it does **not** bypass
CRDT merge - `insert` on an existing key runs this exact `get_mut` + write-back
path internally. The only hazard is borrow scope, never merge semantics.

## Update-or-insert

For "mutate if present, otherwise insert a default", do NOT hold a `get_mut`
guard across the `insert` - the guard keeps `self.items` mutably borrowed, so the
`insert` in the other branch is `E0499`.

**Preferred - Entry API.** One borrow, inserts the default only when absent, then
hands back a guard to mutate:

```rust
use calimero_storage::collections::unordered_map::Entry;
let mut guard = self.items.entry(key)?.or_insert(LwwRegister::new(default_value))?;
guard.set(new_value); // value is now guaranteed present; written back on drop
```

**Alternative - get, mutate, insert (disjoint borrows).** `get` returns an owned
copy that holds no borrow, so the branches never overlap:

```rust
let next = match self.items.get(&key)? {
    Some(v) => { let mut t = v.get().clone(); /* mutate t */ t }
    None    => default_value,
};
self.items.insert(key, LwwRegister::new(next))?;
```

**Anti-patterns (both fail to compile with `E0499`):**

```rust
// WRONG: the guard's mutable borrow of `self.items` is still live in `else`.
if let Some(mut guard) = self.items.get_mut(&key)? {
    guard.set(new_value);
} else {
    self.items.insert(key, LwwRegister::new(default_value))?; // E0499
}

// WRONG: binding the guard to a local first does NOT fix it. `ValueMut` has a
// Drop impl, so its borrow lives to the end of the scope, not the match arm.
let existing = self.items.get_mut(&key)?;
match existing {
    Some(mut guard) => guard.set(new_value),
    None => self.items.insert(key, LwwRegister::new(default_value))?, // E0499
}
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
