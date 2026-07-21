# CRDT Storage Types

All shared application state must use conflict-free replicated data types (CRDTs). These types
handle concurrent writes from multiple context members automatically.

## Why CRDTs

When two nodes both mutate state while offline and then reconnect, the CRDT engine merges both sets
of changes deterministically — no manual conflict resolution needed. Standard `HashMap`, `Vec`, or
`HashSet` do not have this property and must never be used for state that is shared across context
members.

---

## Type reference

| Type                      | Use for                               | Key rule                                             |
| ------------------------- | ------------------------------------- | ---------------------------------------------------- |
| `UnorderedMap<K, V>`      | Key-value store                       | Wrap values in `LwwRegister<V>` for scalar values    |
| `Vector<T>`               | Append-only ordered log               | Cannot remove items                                  |
| `UnorderedSet<T>`         | Unique value collection               | Grow-only by default                                 |
| `LwwRegister<T>`          | Single mutable scalar                 | Last write wins — safe for simple values             |
| `Counter`                 | Grow-only integer counter             | `.increment()`, `.value()`                           |
| `Counter<true>`           | PN counter (supports decrement)       | `.increment()`, `.decrement()`, `.value()`           |
| `FrozenStorage<T>`        | Immutable content-addressed entries   | Write once; identified by hash                       |
| `UserStorage<T>`          | Per-member private storage            | NOT synced to other members                          |
| `ReplicatedGrowableArray` | Collaborative text / ordered sequence | For collaborative editing                            |
| `SortedMap<K, V>`         | Key-ordered map                       | `range`/`prefix`/`page`/`first`/`last` (0.11)        |
| `SortedSet<T>`            | Ordered unique set                    | Ordered `range`/`prefix`/`page` (0.11)               |
| `AuthoredMap<K, V>`       | Per-entry author ownership            | Only an entry's author can modify it (0.11)          |
| `AuthoredVector<T>`       | Per-slot author ownership             | Only a slot's author can modify it (0.11)            |
| `SharedStorage<T>`        | Group-writable value (writer set)     | Explicit writer set; prefer over map+max-wins (0.11) |

> **0.11 additions** — `SortedMap`/`SortedSet` add ordered range/prefix/paged queries (a node-local
> ordered index over the same add-wins entry set); `AuthoredMap`/`AuthoredVector` enforce per-entry/
> slot author ownership; `SharedStorage<T>` (`SharedStorage::new(writers, frozen)`, alias of
> `PermissionedStorage<T, WriterSetAcl>`) is a group-writable value gated by a writer set.

---

## Rust import

```rust
use calimero_storage::collections::{
    Counter, FrozenStorage, LwwRegister, ReplicatedGrowableArray,
    UnorderedMap, UnorderedSet, UserStorage, Vector,
};
```

> **Critical:** Do NOT use `calimero_sdk::state::*` — that path no longer exists.

---

## Common patterns

### Key-value store

```rust
items: UnorderedMap<String, LwwRegister<String>>,

// Write
self.items.insert(key, LwwRegister::new(value))?;

// In-place update (mutate if present, nothing else touches `self.items`).
// The `get_mut` guard writes back on drop and holds a mutable borrow of the
// whole map until then, so it must not overlap any other use of the map.
if let Some(mut guard) = self.items.get_mut(&key)? {
    guard.set(new_value);
}

// Update-or-insert: do NOT `insert` in an `else` while the guard is alive
// (E0499). Use the Entry API instead:
let mut guard = self.items.entry(key)?.or_insert(LwwRegister::new(default_value))?;
guard.set(new_value);

// Read
let val = self.items.get(&key)?.map(|v| v.get().clone());
```

### Append-only log

```rust
log: Vector<String>,

self.log.push(entry)?;
let all: Vec<String> = self.log.iter()?.collect();
```

### Counter

```rust
counter: Counter,

self.counter.increment()?;
let n = self.counter.value()?;
```

### Per-member private data (not synced)

```rust
notes: UserStorage<String>,

self.notes.set("my private note".to_string())?;
let note = self.notes.get()?;
```

---

## TypeScript (SDK JS) equivalents

The JS SDK provides equivalent CRDT types:

```typescript
import { UnorderedMap, Vector, Counter } from '@calimero-network/calimero-sdk-js/collections';

@State
class AppState {
  items: UnorderedMap<string, string> = new UnorderedMap();
  log: Vector<string> = new Vector();
  counter: Counter = new Counter();
}
```

JS state fields must also be CRDT types — no plain `Map`, `Set`, or `Array`.

---

## Rules

1. **Never use `std::collections` for shared state.** `HashMap`, `BTreeMap`, `Vec`, `HashSet` are
   not CRDTs and will cause data loss on concurrent writes.
2. **All collection operations are fallible in Rust.** Always use `?` to propagate errors.
3. **`FrozenStorage` is write-once.** Use it for immutable content (images, blobs) that are
   identified by hash.
4. **`UserStorage` is per-member.** Only the local member can read/write it — it is never synced.
