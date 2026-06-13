# State Schema Migrations

When you need to change the shape of your app's state (add a field, rename a field, change a type),
use `#[app::migrate]` to write a migration function that converts the old Borsh bytes to the new
state struct.

The migration runs **once** when the upgraded WASM is installed on a context that has existing
state. New contexts (no prior state) call `#[app::init]` as normal.

---

## How it works

1. Define the OLD state struct with `BorshDeserialize` only (for reading old bytes)
2. Define the NEW state struct (your updated `#[app::state]`)
3. Write a `#[app::migrate]` function that reads the old bytes and returns the new struct
4. Install the new WASM — the node calls the migrate function on the existing context

---

## Example: adding a field

```rust
use calimero_sdk::app;
use calimero_sdk::borsh::{BorshDeserialize, BorshSerialize};
use calimero_sdk::state::read_raw;
use calimero_storage::collections::{LwwRegister, UnorderedMap};

// --- V1 (old schema, for deserialization only) ---
#[derive(BorshDeserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
struct AppStateV1 {
    items: UnorderedMap<String, LwwRegister<String>>,
    counter: LwwRegister<u64>,
}

// --- V2 (new schema, adds a `notes` field) ---
#[app::state(emits = for<'a> Event<'a>)]
#[derive(Debug, BorshSerialize, BorshDeserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
pub struct AppStateV2 {
    items:   UnorderedMap<String, LwwRegister<String>>,
    counter: LwwRegister<u64>,
    notes:   LwwRegister<String>,      // new field
}

#[app::event]
pub enum Event<'a> {
    Migrated { from: &'a str, to: &'a str },
}

// --- Migration function ---
#[app::migrate]
pub fn migrate_v1_to_v2() -> AppStateV2 {
    let old_bytes = read_raw().unwrap_or_else(|| {
        panic!("Migration error: no existing state found");
    });

    let old: AppStateV1 = BorshDeserialize::deserialize(&mut &old_bytes[..])
        .unwrap_or_else(|e| panic!("Migration error: deserialization failed: {:?}", e));

    app::emit!(Event::Migrated { from: "1.0.0", to: "2.0.0" });

    AppStateV2 {
        items:   old.items,
        counter: old.counter,
        notes:   LwwRegister::new("added in v2".to_owned()),
    }
}

// --- App logic (same as before, plus new notes methods) ---
#[app::logic]
impl AppStateV2 {
    #[app::init]
    pub fn init() -> AppStateV2 {
        AppStateV2 {
            items:   UnorderedMap::new(),
            counter: LwwRegister::new(0),
            notes:   LwwRegister::new(String::new()),
        }
    }

    pub fn set_notes(&mut self, notes: String) -> app::Result<()> {
        self.notes.set(notes);
        Ok(())
    }
}
```

---

## `read_raw()`

```rust
use calimero_sdk::state::read_raw;

let bytes: Option<Vec<u8>> = read_raw();
```

Returns the raw Borsh-encoded bytes of the current state, or `None` if no state exists (fresh
context). Always `unwrap` with a clear panic message — a missing state during migration is a
programmer error.

---

## Migration scenarios

| Change         | How to handle                                      |
| -------------- | -------------------------------------------------- |
| Add a field    | New field with default value in migrate fn         |
| Remove a field | Simply don't include it in new struct              |
| Rename a field | Map old field name to new field name               |
| Change a type  | Deserialize old, convert value, assign to new type |

---

## Rules

- The migration function must return the **exact** new state type decorated with `#[app::state]`
- The old struct needs only `BorshDeserialize` — do NOT put `#[app::state]` on it
- Keep old struct definitions in the source file (or a `migrations` module) as long as the migration
  exists
- Do NOT call `read_raw()` outside of `#[app::migrate]` — it's only valid in that context
