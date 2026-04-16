# Nested CRDTs and Mergeable

When you use a custom struct as a value in `UnorderedMap<K, V>` or `UserStorage<T>`, that struct
must implement `Mergeable` so the CRDT engine knows how to resolve concurrent writes.

Two ways: derive macro (easiest) or manual impl.

---

## Option 1: `#[derive(Mergeable)]` (recommended when all fields are CRDTs)

Add `calimero-storage-macros` to your dependencies:

```toml
[dependencies]
calimero-sdk             = "0.10"
calimero-storage         = "0.10"
calimero-storage-macros  = "0.10"
```

```rust
use calimero_sdk::app;
use calimero_sdk::borsh::{BorshDeserialize, BorshSerialize};
use calimero_storage::collections::{Counter, UnorderedMap};
use calimero_storage_macros::Mergeable;

/// All fields are CRDTs — derive macro just calls merge() on each field
#[derive(Debug, Mergeable, BorshSerialize, BorshDeserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
pub struct TeamStats {
    pub wins:   Counter,
    pub losses: Counter,
    pub draws:  Counter,
}

#[app::state(emits = MetricsEvent)]
#[derive(Debug, BorshSerialize, BorshDeserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
pub struct AppState {
    teams: UnorderedMap<String, TeamStats>,
}

#[app::logic]
impl AppState {
    pub fn record_win(&mut self, team: String) -> app::Result<u64> {
        let mut stats = self.teams.get(&team)?.unwrap_or_else(|| TeamStats {
            wins:   Counter::new(),
            losses: Counter::new(),
            draws:  Counter::new(),
        });
        stats.wins.increment()?;
        let total = stats.wins.value()?;
        self.teams.insert(team, stats)?;
        Ok(total)
    }
}
```

Use `#[derive(Mergeable)]` whenever all fields are CRDT types (`Counter`, `UnorderedMap`,
`LwwRegister`, `Vector`, etc.).

---

## Option 2: Manual `Mergeable` impl (when fields aren't all CRDTs)

```rust
use calimero_sdk::borsh::{BorshDeserialize, BorshSerialize};
use calimero_storage::collections::{
    crdt_meta::MergeError, LwwRegister, Mergeable, UnorderedMap,
};

#[derive(Debug, BorshSerialize, BorshDeserialize, Default)]
#[borsh(crate = "calimero_sdk::borsh")]
pub struct UserProfile {
    pub name:  LwwRegister<String>,
    pub score: LwwRegister<u64>,
    pub tags:  UnorderedMap<String, LwwRegister<bool>>,
}

impl Mergeable for UserProfile {
    fn merge(&mut self, other: &Self) -> Result<(), MergeError> {
        self.name.merge(&other.name)?;
        self.score.merge(&other.score)?;
        self.tags.merge(&other.tags)?;
        Ok(())
    }
}
```

For structs with non-CRDT primitive fields (e.g. `u64` timestamps), pick a merge strategy explicitly
— typically last-write-wins based on a timestamp field:

```rust
impl Mergeable for FileRecord {
    fn merge(&mut self, other: &Self) -> Result<(), MergeError> {
        // LWW: take the version with the later timestamp
        if other.uploaded_at > self.uploaded_at {
            *self = other.clone();
        }
        Ok(())
    }
}
```

---

## Rules

- Custom value types in `UnorderedMap<K, V>` **must** implement `Mergeable`
- Custom types in `UserStorage<T>` **must** implement `Mergeable + Default`
- `#[derive(Mergeable)]` works only when every field already implements `Mergeable`
- All nested CRDT fields must still be initialized with `::new()` — there is no blanket `Default`
  (exception: when `Default` is derived manually for use with `UserStorage`)
