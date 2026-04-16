# UserStorage and FrozenStorage

Two specialised CRDT collection types for per-member and immutable data.

---

## UserStorage\<T\>

Stores a separate value of type `T` per context member (keyed by public key). Each member can only
read/write their own value via the current executor identity. Reading another member's value
requires explicitly passing their public key.

`T` must implement `BorshSerialize + BorshDeserialize + Mergeable + Default`.

### Simple example (single value per user)

```rust
use calimero_storage::collections::{LwwRegister, UserStorage};

#[app::state]
pub struct AppState {
    // Each member stores their own string value
    user_names: UserStorage<LwwRegister<String>>,
}

#[app::logic]
impl AppState {
    // Write the current executor's value
    pub fn set_my_name(&mut self, name: String) -> app::Result<()> {
        self.user_names.insert(name.into())?;
        Ok(())
    }

    // Read the current executor's value
    pub fn get_my_name(&self) -> app::Result<Option<String>> {
        Ok(self.user_names.get()?.map(|v| v.get().clone()))
    }

    // Read a specific user's value
    pub fn get_name_for(&self, user_key: calimero_sdk::PublicKey) -> app::Result<Option<String>> {
        Ok(self.user_names.get_for_user(&user_key)?.map(|v| v.get().clone()))
    }
}
```

### Nested example (map per user)

When `T` is a collection, it must implement `Mergeable` manually (or via `#[derive(Mergeable)]`):

```rust
use calimero_sdk::borsh::{BorshDeserialize, BorshSerialize};
use calimero_storage::collections::{LwwRegister, Mergeable, UnorderedMap, UserStorage};

#[derive(Debug, BorshSerialize, BorshDeserialize, Default)]
#[borsh(crate = "calimero_sdk::borsh")]
struct UserKvMap {
    map: UnorderedMap<String, LwwRegister<String>>,
}

impl Mergeable for UserKvMap {
    fn merge(&mut self, other: &Self)
        -> Result<(), calimero_storage::collections::crdt_meta::MergeError>
    {
        self.map.merge(&other.map)
    }
}

#[app::state]
pub struct AppState {
    user_data: UserStorage<UserKvMap>,
}

#[app::logic]
impl AppState {
    pub fn set_user_kv(&mut self, key: String, value: String) -> app::Result<()> {
        // get-modify-put pattern
        let mut data = self.user_data.get()?.unwrap_or_default();
        data.map.insert(key, value.into())?;
        self.user_data.insert(data)?;
        Ok(())
    }

    pub fn get_user_kv(&self, key: &str) -> app::Result<Option<String>> {
        let data = self.user_data.get()?;
        match data {
            Some(d) => Ok(d.map.get(key)?.map(|v| v.get().clone())),
            None => Ok(None),
        }
    }
}
```

### Key methods

| Method                           | Description                      |
| -------------------------------- | -------------------------------- |
| `insert(value: T)?`              | Store value for current executor |
| `get()?`                         | Get value for current executor   |
| `get_for_user(key: &PublicKey)?` | Get value for a specific user    |

---

## FrozenStorage\<T\>

Content-addressed, **immutable** storage. Values are keyed by their SHA-256 hash. Once inserted, a
value can never be modified or deleted. All members share the same frozen entries (unlike
`UserStorage`).

`T` must implement `BorshSerialize + BorshDeserialize + Into<FrozenValue<T>>`. Typically `T` is
`String` or a `Vec<u8>`.

```rust
use calimero_storage::collections::FrozenStorage;

#[app::state]
pub struct AppState {
    frozen: FrozenStorage<String>,
}

#[app::logic]
impl AppState {
    /// Insert a value — returns its 32-byte SHA-256 hash
    pub fn add_frozen(&mut self, value: String) -> app::Result<[u8; 32]> {
        let hash = self.frozen.insert(value.into())?;
        Ok(hash)
    }

    /// Retrieve by hash
    pub fn get_frozen(&self, hash: [u8; 32]) -> app::Result<Option<String>> {
        Ok(self.frozen.get(&hash)?.map(|v| v.clone()))
    }
}
```

### Typical usage pattern

Since hashes are `[u8; 32]`, encode them as hex or base58 strings for JSON:

```rust
use hex;

pub fn add_frozen(&mut self, value: String) -> app::Result<String> {
    let hash = self.frozen.insert(value.into())?;
    Ok(hex::encode(hash))  // return as hex string for JSON clients
}

pub fn get_frozen(&self, hash_hex: String) -> app::Result<Option<String>> {
    let mut hash = [0u8; 32];
    hex::decode_to_slice(&hash_hex, &mut hash)
        .map_err(|_| /* your error type */)?;
    Ok(self.frozen.get(&hash)?.map(|v| v.clone()))
}
```

### Key methods

| Method                     | Description                          |
| -------------------------- | ------------------------------------ |
| `insert(value: T.into())?` | Store value, returns `[u8; 32]` hash |
| `get(&hash)?`              | Retrieve value by hash               |

---

## Cargo.toml — add hex for hash encoding

```toml
[dependencies]
hex = "0.4"
```
