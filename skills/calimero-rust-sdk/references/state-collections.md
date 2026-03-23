# CRDT State Collections

Calimero provides conflict-free replicated data types for application state. These are the only correct way to store persistent, shared state.

> **Import path:** CRDT collections live in `calimero_storage::collections`, **not**
> `calimero_sdk::state`. You need `calimero-storage` as a dependency (see below).

## Available Collections

| Type | Use for | std equivalent |
| --- | --- | --- |
| `calimero_storage::collections::UnorderedMap<K, V>` | Key-value mapping | `HashMap<K, V>` |
| `calimero_storage::collections::UnorderedSet<T>` | Unique values | `HashSet<T>` |
| `calimero_storage::collections::Vector<T>` | Ordered list | `Vec<T>` |
| `calimero_storage::collections::LwwRegister<T>` | Single CRDT value (last-writer-wins) | `Option<T>` / plain field |

## Cargo.toml

Both `calimero-sdk` and `calimero-storage` are required:

```toml
[dependencies]
calimero-sdk     = { git = "https://github.com/calimero-network/core.git", rev = "<same-rev-as-merod>" }
calimero-storage = { git = "https://github.com/calimero-network/core.git", rev = "<same-rev-as-merod>" }
```

> **Version pinning:** always use the same `rev` (or `tag`) as the `merod` binary you are
> running. `branch = "master"` will break when the SDK moves ahead of your local node.
> Run `merod --version` to find the matching commit or release tag.

## Usage

```rust
use calimero_storage::collections::{UnorderedMap, Vector};

#[derive(Default, BorshDeserialize, BorshSerialize)]
pub struct AppState {
    items: UnorderedMap<String, String>,
    log: Vector<String>,
}

#[app::logic]
impl AppState {
    pub fn set(&mut self, key: String, value: String) {
        self.items.insert(key, value);
    }

    pub fn get(&self, key: &str) -> Option<&String> {
        self.items.get(key)
    }

    pub fn append(&mut self, entry: String) {
        self.log.push(entry);
    }
}
```

## LwwRegister — single-value CRDT

Use `LwwRegister<T>` for scalar fields that need CRDT semantics (last-writer-wins on concurrent updates):

```rust
use calimero_storage::collections::LwwRegister;

#[derive(Default, BorshDeserialize, BorshSerialize)]
pub struct AppState {
    name: LwwRegister<String>,
    count: LwwRegister<u64>,
}

#[app::logic]
impl AppState {
    pub fn set_name(&mut self, name: String) {
        self.name.set(name);
    }

    pub fn get_name(&self) -> Option<&String> {
        self.name.get()
    }
}
```

## Storing complex types in CRDT collections

CRDT collection values must implement `BorshSerialize + BorshDeserialize`. For types that
don't (e.g., third-party structs), serialize them to a JSON string and store that inside an
`LwwRegister<String>` or as a map value:

```rust
use calimero_storage::collections::LwwRegister;
use calimero_sdk::serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
#[serde(crate = "calimero_sdk::serde")]
struct PlayerInfo {
    display_name: String,
    score: u64,
}

#[app::logic]
impl AppState {
    pub fn set_player(&mut self, info: PlayerInfo) {
        let json = calimero_sdk::serde_json::to_string(&info).unwrap();
        self.player_json.set(json);
    }

    pub fn get_player(&self) -> Option<PlayerInfo> {
        self.player_json.get().and_then(|s| {
            calimero_sdk::serde_json::from_str(s).ok()
        })
    }
}
```

## Keys and values must implement

- `BorshSerialize + BorshDeserialize`
- `Clone` (for most operations)

## Important

CRDT collections handle concurrent writes from different context members automatically —
you never need to manually resolve conflicts. Writes from different members are merged
deterministically using the DAG-based sync engine.
