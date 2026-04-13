# Private Storage

Calimero apps have two storage scopes:

| Scope | Who can read | Synced across members? |
|---|---|---|
| Shared state (CRDT) | All context members | Yes — automatic |
| Private storage | Only the local node/member | No |

## Declaring private storage

Use `#[app::private]` on a separate struct. Private storage is **never broadcast** to other nodes.

```rust
use calimero_sdk::app;
use calimero_sdk::borsh::{BorshDeserialize, BorshSerialize};
use calimero_storage::collections::UnorderedMap;

#[derive(BorshSerialize, BorshDeserialize, Debug)]
#[borsh(crate = "calimero_sdk::borsh")]
#[app::private]
pub struct PrivateData {
    secrets: UnorderedMap<String, String>,
}

impl Default for PrivateData {
    fn default() -> Self {
        Self {
            secrets: UnorderedMap::new(),
        }
    }
}
```

## Reading and writing private storage

```rust
#[app::logic]
impl AppState {
    pub fn set_secret(&mut self, key: String, value: String) -> app::Result<()> {
        // Load (or create default) private storage
        let mut priv_data = PrivateData::private_load_or_default()?;
        // Get a mutable guard
        let mut priv_mut = priv_data.as_mut();

        priv_mut.secrets.insert(key, value)?;
        Ok(())
    }

    pub fn get_secret(&self, key: &str) -> app::Result<Option<String>> {
        let priv_data = PrivateData::private_load_or_default()?;
        Ok(priv_data.secrets.get(key)?.cloned())
    }
}
```

## Real example from battleships — private board storage

```rust
#[derive(BorshSerialize, BorshDeserialize, Debug)]
#[borsh(crate = "calimero_sdk::borsh")]
#[app::private]
pub struct PrivateBoards {
    boards: UnorderedMap<String, PlayerBoard>,
}

impl Default for PrivateBoards {
    fn default() -> Self {
        Self { boards: UnorderedMap::new() }
    }
}

// Usage inside a method:
let mut priv_boards = PrivateBoards::private_load_or_default()?;
let mut priv_mut = priv_boards.as_mut();
let mut pb = priv_mut.boards.get(&key)?.unwrap_or(PlayerBoard::new());
pb.place_ships(ships)?;
priv_mut.boards.insert(key, pb)?;
```

## When to use private storage

- Secrets, credentials, or keys that should not leave the local node
- Per-member preferences or game state (e.g. hidden ship positions in battleships)
- Draft data not yet ready to share with the context
- Caching computed values locally

## When NOT to use private storage

- Anything that must be visible to other context members — use CRDT shared state instead
- Authoritative application state — always use shared CRDT collections for that

## Key points

- `PrivateData::private_load_or_default()?` — loads or creates fresh instance
- `priv_data.as_mut()` — returns a mutable guard; changes are persisted when the guard is dropped
- Private storage uses `UnorderedMap` from `calimero_storage::collections`, same as shared state
- Multiple `#[app::private]` structs can coexist in the same app
