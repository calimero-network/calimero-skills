# Files and blobs

Blobs live outside the app's state: the bytes go to the cluster's sealed blob store, and the state
keeps a `BlobRef` (the blob's SHA-256). A reference in state is what keeps a blob: drop the
reference and the blob goes.

## Keep a blob a client uploaded

The client uploads first (mero-js: `client.apps.blobUpload({ app, body, contentType })`), gets the
blob's id (64 hex digits) and then calls a method with it. A `BlobRef` parameter takes the id as a
string:

```rust
use calimero_sdk::prelude::*;

#[app::state(version = 1)]
pub struct Files {
    /// The files kept, by name: a reference in state is what retains one.
    kept: UnorderedMap<String, BlobRef>,
}

#[app::error]
pub enum Error {
    NotUploaded,
}

#[app::logic]
impl Files {
    #[app::init]
    pub fn init() -> app::Result<Self> {
        Ok(Self::load())
    }

    pub fn attach(&mut self, name: String, file: BlobRef) -> app::Result<()> {
        guards::require_member()?;
        let Some(info) = file.info() else {
            app::bail!(Error::NotUploaded);
        };
        env::log(&format!("{name}: {} bytes of {}", info.size, info.mime));
        let _old = self.kept.insert(&name, &file)?;
        Ok(())
    }

    /// A download grant: the client fetches `GET /apps/{app}/blobs/{id}?grant=..`.
    #[app::view]
    pub fn share(&self, file: BlobRef) -> app::Result<String> {
        Ok(file.grant(3600))
    }
}
```

- `BlobRef::info()` is `None` for a blob the app does not hold.
- `grant(ttl_seconds)` (1 to 86,400) returns a grant anyone holding it can download with.

## Write a file from a run

```rust,ignore
use std::io::Write;
use calimero_sdk::files;

pub fn save_file(&mut self, data: Vec<u8>) -> app::Result<BlobRef> {
    let mut writer = files::create()?;
    writer.write_all(&data)?;
    Ok(writer.finish()?)
}
```

- `files::create()` returns a `Writer` (`std::io::Write`); `finish()` gives the `BlobRef`. A writer
  dropped unfinished leaves no file, and a failed call's files are not kept.
- `files::open(&blob)` reads one, but only inside an `#[app::compute]` run; elsewhere use
  `BlobRef::info` for its size and hash.

Keep the bytes in blobs and only the `BlobRef` and metadata in state: a log entry is capped at 1
MiB.
