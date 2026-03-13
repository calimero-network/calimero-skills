# Private Storage

Calimero apps have two storage scopes:

| Scope | Who can read | Synced across members? |
| --- | --- | --- |
| Shared state (CRDT) | All context members | Yes — automatic |
| Private storage | Only the local member | No |

## Using private storage

```rust
use calimero_sdk::env;

// Write private data
env::private_storage_write(b"my_key", b"my_value");

// Read private data
let value = env::private_storage_read(b"my_key");
// returns Option<Vec<u8>>
```

## When to use private storage

- Secrets, credentials, or keys that should not leave the local node
- Per-member preferences or settings
- Draft data not yet ready to share with the context
- Caching computed values locally

## When NOT to use private storage

- Anything that must be visible to other context members — use CRDT state instead
- Authoritative application state — always use shared CRDT collections for that

## Serializing structured data to private storage

```rust
use calimero_sdk::borsh::{self, BorshSerialize, BorshDeserialize};
use calimero_sdk::env;

#[derive(BorshSerialize, BorshDeserialize)]
struct MyPrivateData {
    token: String,
    created_at: u64,
}

// Write
let data = MyPrivateData { token: "secret".into(), created_at: 1234567890 };
let bytes = borsh::to_vec(&data).unwrap();
env::private_storage_write(b"my_data", &bytes);

// Read
if let Some(bytes) = env::private_storage_read(b"my_data") {
    let data: MyPrivateData = borsh::from_slice(&bytes).unwrap();
}
```
