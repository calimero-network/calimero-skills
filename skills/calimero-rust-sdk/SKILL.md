# calimero-rust-sdk — Agent Instructions

You are helping a developer build a **Calimero WASM application** in Rust using the Calimero SDK.

## What you need to know immediately

- Apps compile to WASM and run inside the `merod` node runtime
- `#[app::state]` goes on the **struct**, `#[app::logic]` goes on the **impl block**
- All CRDT collections are from `calimero_storage::collections::*` — NOT `calimero_sdk::state::*`
- Most collection operations return `Result<>` — always use `?`
- `app::Result<T>` is the correct return type for public methods (not `Result<T, String>`)
- Use `app::bail!(err)` to early-return errors
- Use `app::log!()` not `env::log!()` or `println!()`
- Events are declared with `#[app::event]` on an enum and declared on state with `emits = for<'a> Event<'a>`
- Private storage uses `#[app::private]` struct + `StructName::private_load_or_default()?`
- There is no `main()` — the SDK provides the entry point

## Cargo.toml setup

```toml
[lib]
crate-type = ["cdylib"]

[dependencies]
calimero-sdk     = "0.10"
calimero-storage = "0.10"

[build-dependencies]
calimero-wasm-abi = "0.10"
serde_json        = "1"

[profile.app-release]
inherits         = "release"
codegen-units    = 1
opt-level        = "z"
lto              = true
debug            = false
strip            = "symbols"
panic            = "abort"
overflow-checks  = true
```

For the build script, add `build.rs`:

```rust
fn main() {
    calimero_wasm_abi::export().unwrap();
}
```

## Minimal app skeleton (KV store)

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
        KvStore {
            items: UnorderedMap::new(),
        }
    }

    pub fn set(&mut self, key: String, value: String) -> app::Result<()> {
        app::log!("set {:?} = {:?}", key, value);
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
}
```

## Building

```bash
# Add WASM target (one-time)
rustup target add wasm32-unknown-unknown

# Build with the app-release profile
cargo build --target wasm32-unknown-unknown --profile app-release

# Output: target/wasm32-unknown-unknown/app-release/<crate_name>.wasm
```

## Installing and running on a node (dev workflow)

```bash
# 1. Install app from WASM file
meroctl --node node1 app install \
  --path target/wasm32-unknown-unknown/app-release/myapp.wasm
# Returns: application-id

# 2. Create a context (instance of the app — init() is called)
meroctl --node node1 context create --application-id <application-id>
# Returns: context-id

# 3. Call a mutation
meroctl --node node1 call <context-id> set \
  --args '{"key":"hello","value":"world"}'

# 4. Call a view (read-only)
meroctl --node node1 call <context-id> get \
  --args '{"key":"hello"}' --view
```

## Key rules

- State struct derives `BorshDeserialize, BorshSerialize` — **not** `Default`
- Add `#[borsh(crate = "calimero_sdk::borsh")]` to all borsh types
- Add `#[serde(crate = "calimero_sdk::serde")]` to all serde types
- Never use `HashMap`, `Vec`, `BTreeMap` directly for **persisted shared state** — use CRDT collections
- `Vec<T>` and `Option<T>` are fine for local / return types — just not for fields that need CRDT sync
- Mutations use `&mut self`, views use `&self`
- Return `app::Result<T>` for all public methods; use `?` on collection ops
- Use `app::bail!(err)` to return errors early (like `return Err(err.into())`)

## Cross-context calls (xcall)

```rust
use calimero_sdk::env;
use calimero_sdk::serde_json;

// Call a method on another context
let ctx_bytes: [u8; 32] = /* context id bytes */;
let params = serde_json::json!({ "match_id": id, "winner": w });
let params_bytes = serde_json::to_vec(&params).unwrap();
env::xcall(&ctx_bytes, "on_match_finished", &params_bytes);
```

## Environment functions

```rust
use calimero_sdk::env;

env::executor_id()                                // [u8; 32] — caller's public key bytes
env::context_id()                                 // [u8; 32] — current context ID
env::time_now()                                   // u64 — current time in milliseconds

env::random_bytes(buf: &mut [u8])                 // fill buf with random bytes

env::ed25519_verify(sig: &[u8; 64], pub_key: &[u8; 32], msg: &[u8]) -> bool

// Blob streaming API
let fd = env::blob_create();                      // start writing a new blob
env::blob_write(fd, data: &[u8]) -> u64;          // write bytes
let blob_id: [u8; 32] = env::blob_close(fd);     // finalize, returns content-addressed ID

let fd = env::blob_open(blob_id: &[u8; 32]);      // open blob for reading (returns 0 if not found)
env::blob_read(fd, buffer: &mut [u8]) -> u64;     // read bytes (returns 0 at EOF)
env::blob_close(fd);                              // close read handle

// Make a blob discoverable to all context members
env::blob_announce_to_context(blob_id: &[u8; 32], context_id: &[u8; 32]) -> bool;

// Cross-context call
env::xcall(context_id: &[u8; 32], method: &str, params: &[u8]);
```

## Additional features

- **UserStorage** — per-member isolated storage (not synced to others): see `references/user-and-frozen-storage.md`
- **FrozenStorage** — immutable content-addressed entries: see `references/user-and-frozen-storage.md`
- **Event handlers** — named callbacks triggered when an event is emitted on any peer: see `references/event-handlers.md`
- **Migrations** — `#[app::migrate]` for upgrading state schema: see `references/migrations.md`
- **Blob API** — streaming binary storage from app logic: see `references/blob-api.md`
- **Nested CRDTs** — `#[derive(Mergeable)]` for custom structs used as map values: see `references/nested-crdts.md`

## References

See `references/` for CRDT collections, events, private storage, and examples.
See `rules/` for hard constraints the compiler won't catch.
