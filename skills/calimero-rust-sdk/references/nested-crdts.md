# Nested CRDTs and Mergeable

When you use a custom struct as a value in `UnorderedMap<K, V>` or `UserStorage<T>`, that struct
must implement `Mergeable` so the CRDT engine knows how to resolve concurrent writes.

Two ways: derive macro (easiest) or manual impl.

---

## Option 1: `#[derive(Mergeable)]` (recommended when all fields are CRDTs)

Add `calimero-storage-macros` to your dependencies:

```toml
[dependencies]
calimero-sdk             = { git = "https://github.com/calimero-network/core", tag = "0.11.0-rc.19" }
calimero-storage         = { git = "https://github.com/calimero-network/core", tag = "0.11.0-rc.19" }
calimero-storage-macros  = { git = "https://github.com/calimero-network/core", tag = "0.11.0-rc.19" }
```

```rust
use calimero_sdk::app;
use calimero_sdk::app::Mergeable;
use calimero_sdk::borsh::{BorshDeserialize, BorshSerialize};
use calimero_storage::collections::{Counter, UnorderedMap};

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

`RekeyTarget` is `Mergeable`'s supertrait, so a hand-written impl needs both. A lone
`impl Mergeable` fails with "the trait bound `YourType: RekeyTarget` is not satisfied".

```rust
use calimero_sdk::borsh::{BorshDeserialize, BorshSerialize};
use calimero_storage::address::Id;
use calimero_storage::collections::rekey::{field_child_id, RekeyTarget};
use calimero_storage::collections::{
    crdt_meta::MergeError, LwwRegister, Mergeable, UnorderedMap,
};
use calimero_storage::rekey_field_if_supported;

#[derive(Debug, BorshSerialize, BorshDeserialize, Default)]
#[borsh(crate = "calimero_sdk::borsh")]
pub struct UserProfile {
    pub name:  LwwRegister<String>,
    pub score: LwwRegister<u64>,
    pub tags:  UnorderedMap<String, LwwRegister<bool>>,
}

impl Mergeable for UserProfile {
    fn merge(&mut self, other: &Self) -> Result<(), MergeError> {
        // Call the trait method by name: `LwwRegister` also has an INHERENT
        // `merge` returning `()`, and `self.name.merge(..)?` picks that one.
        Mergeable::merge(&mut self.name, &other.name)?;
        Mergeable::merge(&mut self.score, &other.score)?;
        Mergeable::merge(&mut self.tags, &other.tags)?;
        Ok(())
    }
}

// Each nested collection is re-keyed under a field-namespaced child id, so every
// replica derives the same ids and the children converge instead of diverging.
impl RekeyTarget for UserProfile {
    fn rekey_relative_to(&mut self, parent_id: Id) {
        rekey_field_if_supported!(&mut self.name, field_child_id(parent_id, "name"));
        rekey_field_if_supported!(&mut self.score, field_child_id(parent_id, "score"));
        rekey_field_if_supported!(&mut self.tags, field_child_id(parent_id, "tags"));
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

// Still required, but empty: a struct with no collection fields has no nested ids.
impl RekeyTarget for FileRecord {
    fn rekey_relative_to(&mut self, _parent_id: Id) {}
}
```

---

## Rules

- Custom value types in `UnorderedMap<K, V>` and `UserStorage<T>` **must** implement `Mergeable`
- `Mergeable` requires `RekeyTarget`; `#[derive(Mergeable)]` emits both, a manual impl needs both
- `#[derive(Mergeable)]` works only when every field already implements `Mergeable`
- All nested CRDT fields must still be initialized with `::new()` — there is no blanket `Default`
  (exception: derive `Default` on the struct when it is the `T` of a `SharedStorage<T>`)
