# Blob API

Blobs are binary objects stored outside the CRDT state — large files, images, documents.
The app stores a blob **ID** (32-byte hash) in state; the binary data lives in blob storage.

Two separate steps: **upload the binary** (client-side, before calling the app method),
then **store the metadata + announce** (inside the app method).

---

## Streaming write (create a blob from inside the app)

```rust
use calimero_sdk::env;

// Write arbitrary bytes to a new blob
let fd = env::blob_create();
env::blob_write(fd, b"Hello, World!");
env::blob_write(fd, b" More data...");
let blob_id: [u8; 32] = env::blob_close(fd);  // finalize; returns content-addressed ID

// Announce to context so other nodes can discover and download it
let ctx = env::context_id();
env::blob_announce_to_context(&blob_id, &ctx);
```

## Streaming read (read a blob from inside the app)

```rust
let fd = env::blob_open(&blob_id);  // returns 0 if blob not found
if fd == 0 {
    app::bail!(/* not found error */);
}

let mut buf = [0u8; 4096];
let mut all_bytes = Vec::new();
loop {
    let n = env::blob_read(fd, &mut buf);
    if n == 0 { break; }
    all_bytes.extend_from_slice(&buf[..n as usize]);
}
env::blob_close(fd);
```

---

## Typical pattern: client uploads, app stores metadata

Most apps let the **client** upload binary data via `blobClient.uploadBlob()` (which
returns a blob ID), then call an app method that stores the metadata and announces the blob:

```rust
use calimero_sdk::{app, env};
use calimero_storage::collections::UnorderedMap;

#[app::state]
pub struct FileStore {
    files: UnorderedMap<String, [u8; 32]>,  // name → blob_id
}

#[app::logic]
impl FileStore {
    /// Called after client uploads the blob and gets back blob_id_bytes
    pub fn store_file(
        &mut self,
        name: String,
        blob_id: [u8; 32],
    ) -> app::Result<()> {
        // Announce so all context peers can discover and download it
        let ctx = env::context_id();
        env::blob_announce_to_context(&blob_id, &ctx);

        self.files.insert(name, blob_id)?;
        Ok(())
    }

    pub fn get_blob_id(&self, name: &str) -> app::Result<Option<[u8; 32]>> {
        Ok(self.files.get(name)?)
    }
}
```

---

## env functions summary

| Function | Signature | Notes |
|---|---|---|
| `blob_create()` | `() -> u64` | Returns write fd |
| `blob_write(fd, data)` | `(u64, &[u8]) -> u64` | Returns bytes written |
| `blob_close(fd)` | `(u64) -> [u8; 32]` | Finalizes; returns blob ID |
| `blob_open(id)` | `(&[u8; 32]) -> u64` | Returns read fd, 0 if missing |
| `blob_read(fd, buf)` | `(u64, &mut [u8]) -> u64` | Returns bytes read, 0 at EOF |
| `blob_announce_to_context(blob_id, ctx_id)` | `(&[u8; 32], &[u8; 32]) -> bool` | Makes blob discoverable to peers; context must match current context |

---

## Encoding blob IDs for JSON

Blob IDs are `[u8; 32]`. For JSON-friendly responses, encode as hex or base58:

```rust
// hex (add hex = "0.4" to Cargo.toml)
let hex_id: String = hex::encode(&blob_id);
let blob_id: [u8; 32] = hex::decode(&hex_str).unwrap().try_into().unwrap();

// base58 (add bs58 to Cargo.toml)
let b58_id: String = bs58::encode(&blob_id).into_string();
```

---

## Cargo.toml additions

```toml
[dependencies]
hex  = "0.4"   # for hex encoding
bs58 = "0.5"   # for base58 encoding (optional)
```
