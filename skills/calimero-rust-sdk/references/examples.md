# Reference Examples

## KV Store (simplest app)

Source: https://github.com/calimero-network/kv-store

```rust
use calimero_sdk::app;
use calimero_sdk::borsh::{BorshDeserialize, BorshSerialize};
use calimero_sdk::state::UnorderedMap;

#[derive(Default, BorshDeserialize, BorshSerialize)]
pub struct KvStore {
    entries: UnorderedMap<String, String>,
}

#[app::state]
impl KvStore {}

#[app::logic]
impl KvStore {
    #[app::init]
    pub fn init() -> KvStore {
        KvStore::default()
    }

    pub fn set(&mut self, key: String, value: String) {
        self.entries.insert(key, value);
    }

    pub fn get(&self, key: String) -> Option<String> {
        self.entries.get(&key).cloned()
    }

    pub fn entries(&self) -> Vec<(String, String)> {
        self.entries.iter().map(|(k, v)| (k.clone(), v.clone())).collect()
    }

    pub fn remove(&mut self, key: String) -> bool {
        self.entries.remove(&key).is_some()
    }
}
```

## Calling from a client (JSON-RPC)

Mutations (state changes):
```json
{
  "method": "set",
  "args": { "key": "hello", "value": "world" }
}
```

Views (read-only):
```json
{
  "method": "get",
  "args": { "key": "hello" }
}
```

## Other reference apps in core/apps

- `collaborative-editor` — concurrent text editing with CRDT merge
- `private-data` — mixing shared and private storage patterns
- `team-metrics` — structured data with multiple CRDT collections
- `blobs` — binary payload handling

Source: https://github.com/calimero-network/core/tree/master/apps
