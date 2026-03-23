# Reference Examples

## KV Store (simplest app)

Source: https://github.com/calimero-network/kv-store

### Full Cargo.toml

```toml
[package]
name = "kv-store"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
calimero-sdk     = { git = "https://github.com/calimero-network/core.git", rev = "<same-rev-as-merod>" }
calimero-storage = { git = "https://github.com/calimero-network/core.git", rev = "<same-rev-as-merod>" }

[build-dependencies]
calimero-sdk = { git = "https://github.com/calimero-network/core.git", rev = "<same-rev-as-merod>", features = ["macros"] }

[profile.app-release]
inherits = "release"
codegen-units = 1
opt-level = "z"
lto = true
debug = false
panic = "abort"
overflow-checks = true
```

### src/lib.rs

```rust
use calimero_sdk::app;
use calimero_sdk::borsh::{BorshDeserialize, BorshSerialize};
use calimero_storage::collections::UnorderedMap;

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

The actual JSON-RPC payload sent to the node uses `rpcClient.execute()`. Below is the
wire format for reference — in practice, use the typed client helpers from `calimero-client-js`.

Mutation:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "execute",
  "params": {
    "contextId": "<context-id>",
    "method": "set",
    "argsJson": { "key": "hello", "value": "world" },
    "executorPublicKey": "<your-executor-public-key>"
  }
}
```

View:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "execute",
  "params": {
    "contextId": "<context-id>",
    "method": "get",
    "argsJson": { "key": "hello" },
    "executorPublicKey": "<your-executor-public-key>"
  }
}
```

## .gitignore for Calimero app projects

Create this at the project root:

```gitignore
target/
res/*.wasm
node_modules/
dist/
.DS_Store
```

## Other reference apps in core/apps

- `collaborative-editor` — concurrent text editing with CRDT merge
- `private-data` — mixing shared and private storage patterns
- `team-metrics` — structured data with multiple CRDT collections
- `blobs` — binary payload handling

Source: https://github.com/calimero-network/core/tree/master/apps
