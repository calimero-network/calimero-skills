# State: tables and collections

An app's state is the fields of its `#[app::state]` struct. Each field is a **table** or a
**collection**: a handle over the app's ordered key-value store, named by the field. Loading the
state (`Self::load()`) reads nothing; every operation reads or writes only the keys it needs.

One leader applies every write in log order, so these are plain data structures, not CRDTs: there is
nothing to merge. `Text` and `RichText` are the exception, so edits typed against a stale view still
land where they were meant.

## Collections

| Type                        | Operations                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cell<T>`                   | `get` (`Option<T>`), `set(&v)`, `clear`                                                                                                                                   |
| `UnorderedMap<K, V>`        | `get`, `contains`, `insert(&k, &v)` / `remove(&k)` (return the old value), `len`, `is_empty`, `clear`; ordered: `page`, `range`, `prefix`, `starts_with`, `first`, `last` |
| `Set<T>`                    | `insert` / `remove` (bool), `contains`, `len`, `is_empty`, `clear`, `page`, `range`, `prefix`, `starts_with`, `first`, `last`                                             |
| `Vector<T>`                 | `push` (returns the position), `get`, `set` (`OutOfBounds` past the end), `pop`, `len`, `is_empty`, `page`, `clear`                                                       |
| `Counter`                   | `get`, `add(i64)`, `increment`                                                                                                                                            |
| `PerUser<T>`                | `get` / `set` / `remove` on the **caller's** own value; `get_for(account)` reads another's                                                                                |
| `Frozen<T, H = CborSha256>` | content-addressed, write-once: `insert` returns `(hex hash, new?)`, `get(hex)`, `contains(hex)`, `hash_of`                                                                |
| `Text`                      | `insert_after(id, str)`, `delete_ids`, `insert(index, str)`, `delete(index, n)`, `read`, `chars`, `id_at`, `index_of`, `len`, `clear`                                     |
| `RichText`                  | `text()` / `text_mut()` (a `Text`), `mark(start, end, key, value, expand)`, `mark_ids`, `marks`, `spans`, `clear`                                                         |

Despite its name, `UnorderedMap` reads in key order, so it also serves as a sorted map. Tuple keys
make nested maps (`UnorderedMap<(String, String), V>`; read one outer key with
`prefix(&[KeyPart::Str(outer)], opts)`). Values are any serde type; they are stored as deterministic
CBOR.

```rust
use calimero_sdk::prelude::*;

#[app::state(version = 1)]
pub struct Store {
    items: UnorderedMap<String, String>,
    tags: Set<String>,
    history: Vector<String>,
    visits: Counter,
    title: Cell<String>,
    profile: PerUser<String>,
}

#[app::logic]
impl Store {
    #[app::init]
    pub fn init() -> app::Result<Self> {
        Ok(Self::load())
    }

    pub fn set(&mut self, key: String, value: String) -> app::Result<Option<String>> {
        guards::require_member()?;
        let _at = self.history.push(&format!("set {key}"))?;
        Ok(self.items.insert(&key, &value)?)
    }

    pub fn set_profile(&mut self, bio: String) -> app::Result<()> {
        guards::require_member()?;
        self.profile.set(&bio)?; // the caller's own value
        Ok(())
    }

    pub fn visit(&mut self) -> app::Result<u64> {
        Ok(self.visits.increment()?)
    }

    #[app::view]
    pub fn title(&self) -> app::Result<String> {
        Ok(self.title.get()?.unwrap_or_else(|| "Untitled".into()))
    }
}
```

## Tables

A `Table<R>` holds records: rows with a primary key, unique constraints, indexes, maintained counts
and, optionally, full-text search.

```rust
use calimero_sdk::prelude::*;

#[derive(Record, Clone, Debug)]
#[table(
    key = "id",
    unique(slot = ["room_id", "start"]),
    index(by_start = ["checked_in", "start"]),
    count(by_room = ["room_id"]),
)]
pub struct Booking {
    pub id: String,
    pub room_id: String,
    pub start: u64,
    pub title: String,
    pub checked_in: bool,
}
```

| Method                         | Does                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `insert(record)`               | Inserts; an existing key is `Duplicate { index: "key" }`, a unique clash `Duplicate { index: <name> }`. |
| `upsert(record)`               | Inserts or replaces; unique constraints still apply.                                                    |
| `get(&key)` / `contains(&key)` | The record with this key / whether it exists.                                                           |
| `update(&key, \|r\| ..)`       | Changes the record and re-indexes what changed; `false` when absent.                                    |
| `remove(&key)`                 | Removes the record and its index, unique and count entries; `false` when absent.                        |
| `find(index, &prefix, opts)`   | Records whose index fields start with `prefix`, in index order, one page at a time.                     |
| `scan(opts)`                   | All records in key order, one page at a time.                                                           |
| `count(name, &prefix)`         | A maintained count: one read when `prefix` names every field of the count.                              |
| `search(query, ..)`            | Full-text search over `#[table(search = [..])]` fields, best match first (views only).                  |

Index and count names are camelCase (`by_start` → `"byStart"`). Prefixes and bounds are `KeyPart`s:
`Str`, `Int`, `Bool`, `Bytes`. A record's fields are key parts (`String`, integers, `bool`, bytes,
`Option` of those): a list, a nested struct or a `BlobRef` goes in a map or table beside it, keyed
by the record's id.

```rust,ignore
let page = self.bookings.find(
    "byStart",
    &[KeyPart::Bool(false)],
    FindOpts::default().limit(50),
)?;
for b in page.items {
    env::log(&format!("{} at {}", b.title, b.start));
}
```

### Pages

Every multi-row read returns `Page { items, next }`. `FindOpts` sets `limit` (100 when unset, at
most 1,000), `cursor` (the previous page's `next`), `reverse`, and `from` (inclusive) / `to`
(exclusive) bounds after the prefix.

## Costs and limits

- Lengths and counts are stored, so `len` and `count` are one read, never a scan.
- `clear` deletes in batches of at most 1,000 until nothing is left.
- A key over 1 KiB is refused (`KeyTooLong`).
- A run's log entry is capped at 1 MiB: keep large bytes in blobs (`references/blob-api.md`) and
  only the `BlobRef` in state.
- Prefer `env::unique_id()` to a `Counter` for ids: it needs no read and no write.
