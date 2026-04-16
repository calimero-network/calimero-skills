# Reference Examples

## KV Store (simplest app)

Source: <https://github.com/calimero-network/kv-store>

```rust
use calimero_sdk::app;
use calimero_sdk::borsh::{BorshDeserialize, BorshSerialize};
use calimero_sdk::serde::Serialize;
use calimero_storage::collections::{LwwRegister, UnorderedMap};

#[app::state(emits = for<'a> Event<'a>)]
#[derive(Debug, BorshSerialize, BorshDeserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
pub struct KvStore {
    items: UnorderedMap<String, LwwRegister<String>>,
}

#[app::event]
pub enum Event<'a> {
    Inserted { key: &'a str, value: &'a str },
    Updated  { key: &'a str, value: &'a str },
    Removed  { key: &'a str },
}

#[app::logic]
impl KvStore {
    #[app::init]
    pub fn init() -> KvStore {
        KvStore { items: UnorderedMap::new() }
    }

    pub fn set(&mut self, key: String, value: String) -> app::Result<()> {
        if self.items.contains(&key)? {
            app::emit!(Event::Updated { key: &key, value: &value });
        } else {
            app::emit!(Event::Inserted { key: &key, value: &value });
        }
        self.items.insert(key, value.into())?;
        Ok(())
    }

    pub fn get(&self, key: &str) -> app::Result<Option<String>> {
        Ok(self.items.get(key)?.map(|v| v.get().clone()))
    }

    pub fn remove(&mut self, key: &str) -> app::Result<Option<String>> {
        app::emit!(Event::Removed { key });
        Ok(self.items.remove(key)?.map(|v| v.get().clone()))
    }

    pub fn entries(&self) -> app::Result<Vec<(String, String)>> {
        Ok(self.items.entries()?
            .map(|(k, v)| (k, v.get().clone()))
            .collect())
    }
}
```

## Calling from a client (JSON-RPC)

Mutations (state changes):

```json
{ "method": "set", "args": { "key": "hello", "value": "world" } }
```

Views (read-only):

```json
{ "method": "get",  "args": { "key": "hello" } }
{ "method": "entries", "args": {} }
```

## Lobby + Game pattern (battleships)

Two separate WASM crates — a Lobby context and a Game context. The Game context calls back into the
Lobby via `env::xcall()` when a match ends.

```rust
// In game crate — notify lobby when match finishes
let params = calimero_sdk::serde_json::json!({
    "match_id": mid,
    "winner": winner_key,
    "loser": loser_key,
});
let params_bytes = calimero_sdk::serde_json::to_vec(&params).unwrap();
calimero_sdk::env::xcall(&lobby_ctx_bytes, "on_match_finished", &params_bytes);
```

## Error handling pattern

```rust
use thiserror::Error;
use calimero_sdk::serde::Serialize;

#[derive(Debug, Error, Serialize)]
#[serde(crate = "calimero_sdk::serde")]
#[serde(tag = "kind", content = "data")]
pub enum AppError {
    #[error("not found: {0}")]
    NotFound(String),
    #[error("forbidden: {0}")]
    Forbidden(&'static str),
}

// In a method:
pub fn get_item(&self, key: &str) -> app::Result<String> {
    let Some(v) = self.items.get(key)? else {
        app::bail!(AppError::NotFound(key.to_string()));
    };
    Ok(v.get().clone())
}
```

## Other reference apps

- `battleships` — multi-context game, private storage, xcall, event handlers
- `calimero-scaffolding-e2e-application` — exercises all CRDT types, blob API, user storage
- `curb` — chat app, event-driven UI updates
- Source: <https://github.com/calimero-network/>
