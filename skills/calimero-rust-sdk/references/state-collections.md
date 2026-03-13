# CRDT State Collections

Calimero provides conflict-free replicated data types for application state. These are the only correct way to store persistent, shared state.

## Available Collections

| Type | Use for | std equivalent |
| --- | --- | --- |
| `calimero_sdk::state::Map<K, V>` | Key-value mapping | `HashMap<K, V>` |
| `calimero_sdk::state::Set<T>` | Unique values | `HashSet<T>` |
| `calimero_sdk::state::Vector<T>` | Ordered list | `Vec<T>` |
| `calimero_sdk::state::UnorderedMap<K, V>` | Unordered map | `HashMap<K, V>` |

## Usage

```rust
use calimero_sdk::state::{Map, Vector};

#[derive(Default, BorshDeserialize, BorshSerialize)]
pub struct AppState {
    items: Map<String, String>,
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

## Keys and values must implement

- `BorshSerialize + BorshDeserialize`
- `Clone` (for most operations)

## Important

CRDT collections handle concurrent writes from different context members automatically —
you never need to manually resolve conflicts. Writes from different members are merged
deterministically using the DAG-based sync engine.
