# calimero-rust-sdk — Agent Instructions

You are helping a developer build a **Calimero app** in Rust with core 1.0's component SDK
(`calimero-sdk`).

## What you need to know immediately

- An app is a Rust library built into a **`calimero:app` WebAssembly component** (`wasm32-wasip2`)
  by `mero-app-build`. Each app instance runs on its own replicated log: the cluster's leader runs a
  call once and the replicas apply its changes.
- Because one leader applies every write in log order, state is **plain collections, not CRDTs**:
  `Table`, `UnorderedMap`, `Set`, `Vector`, `Cell`, `Counter`, `PerUser`, `Frozen` (plus `Text` /
  `RichText`, the only CRDTs left). A later write replaces an earlier one.
- One import brings every attribute, collection, `env` and `guards` into scope:
  `use calimero_sdk::prelude::*;`
- `#[app::state(version = N)]` goes on the **struct**, `#[app::logic]` on its **impl block**;
  `#[app::init] pub fn init() -> app::Result<Self> { Ok(Self::load()) }`.
- Every method returns `app::Result<T>`; collection operations return `Result` too, so use `?`.
  `app::bail!(Error::X { .. })` returns an `#[app::error]` variant.
- Calls are `&mut self`; reads are `&self` with `#[app::view]`. Method and argument names are
  camelCase on the wire (`add_note` → `addNote`).
- The caller comes from `env::caller()`, `guards::require_member()` or `guards::require_admin()`,
  never from an argument. There are no executor keys and no contexts: a person is an **account**,
  and the instance lives in an **organization**.
- Events: `env::emit(Event::X { .. }, Audience::All)?`, delivered once the call commits.
- Time, randomness and ids come from `env::time_now()` (milliseconds), `env::random_bytes(n)` and
  `env::unique_id()`: every logged run must be deterministic.
- **SDK 0.12 is gone** (core 1.0.0-rc.9 removed it, and nodes refuse its WASM modules):
  `calimero-storage`, `calimero_storage::collections`, `LwwRegister`, `UserStorage`,
  `#[app::state(emits = ..)]`, `app::emit!`, `app::log!`, `#[app::private]`, `env::context_id()`,
  `env::executor_id()`, borsh-serialized state, `cargo mero` and merobox do not exist in 1.0.

## Cargo.toml setup

```toml
[package]
name = "my-app"
version = "0.1.0"
edition = "2021"

[lib]
# A calimero:app component. No rlib: tests run the BUILT component on core's engine.
crate-type = ["cdylib"]

[dependencies]
# Pin by git tag to the core release your cluster runs.
calimero-sdk = { git = "https://github.com/calimero-network/core", tag = "1.0.0-rc.19" }
serde = { version = "1", features = ["derive"] }

# The TestApp harness and the builder it builds the crate with (host only).
[target.'cfg(not(target_arch = "wasm32"))'.dev-dependencies]
calimero-sdk = { git = "https://github.com/calimero-network/core", tag = "1.0.0-rc.19", features = ["testing"] }
calimero-app-build = { git = "https://github.com/calimero-network/core", tag = "1.0.0-rc.19" }
serde_json = "1"

[profile.release]
codegen-units = 1
opt-level = "z"
lto = true
panic = "abort"
overflow-checks = true
```

## A complete app

```rust
use calimero_sdk::prelude::*;

/// A row of the `notes` table: key `id`, newest-first through `by_created`.
#[derive(Record, Clone, Debug)]
#[table(key = "id", index(by_created = ["created_ms", "id"]))]
pub struct Note {
    pub id: String,
    pub author: String,
    pub text: String,
    pub created_ms: u64,
}

#[app::state(version = 1)]
pub struct Notes {
    notes: Table<Note>,
    pinned: Cell<String>,
}

#[app::error]
pub enum Error {
    NotFound { id: String },
    Forbidden { message: String },
    Invalid { message: String },
}

#[app::event]
pub enum Event {
    NoteAdded { id: String, author: String },
    NoteRemoved { id: String },
}

#[app::logic]
impl Notes {
    #[app::init]
    pub fn init() -> app::Result<Self> {
        Ok(Self::load())
    }

    /// Adds a note as the caller and returns its id.
    pub fn add_note(&mut self, text: String) -> app::Result<String> {
        let author = guards::require_member()?;
        if text.trim().is_empty() {
            app::bail!(Error::Invalid { message: "empty note".into() });
        }
        let id = env::unique_id();
        self.notes.insert(Note {
            id: id.clone(),
            author: author.clone(),
            text,
            created_ms: env::time_now(),
        })?;
        env::emit(Event::NoteAdded { id: id.clone(), author }, Audience::All)?;
        Ok(id)
    }

    /// Removes a note: its author only.
    pub fn remove_note(&mut self, id: String) -> app::Result<()> {
        let me = guards::require_member()?;
        let Some(note) = self.notes.get(&id)? else {
            app::bail!(Error::NotFound { id });
        };
        if note.author != me {
            app::bail!(Error::Forbidden { message: "not your note".into() });
        }
        let _removed = self.notes.remove(&id)?;
        env::emit(Event::NoteRemoved { id }, Audience::All)?;
        Ok(())
    }

    /// The newest notes: at most 100 (one page).
    #[app::view]
    pub fn list_notes(&self) -> app::Result<Vec<Note>> {
        Ok(self
            .notes
            .find("byCreated", &[], FindOpts::default().limit(100).reverse())?
            .items)
    }

    /// Pins a note's id: org admins only.
    pub fn pin(&mut self, id: String) -> app::Result<()> {
        guards::require_admin()?;
        self.pinned.set(&id)?;
        Ok(())
    }

    #[app::view]
    pub fn pinned(&self) -> app::Result<Option<String>> {
        Ok(self.pinned.get()?)
    }
}
```

## The attributes

| Attribute                                      | On                                 | Does                                                                                                                                  |
| ---------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `#[app::state(version = N)]`                   | struct                             | The state root. Fields are collection handles named by their camelCase field name; `Self::load()` reads nothing.                      |
| `#[app::logic]`                                | the state's `impl`                 | Every `pub fn` is a method; private `fn`s are helpers. Generates the dispatcher and the ABI (the component's `calimero:abi` section). |
| `#[app::init]`                                 | `fn init(..) -> app::Result<Self>` | Runs once, as the owner, when the instance is created. Its arguments, if any, come from `apps.create`'s `initArgs`.                   |
| `#[app::view]`                                 | `&self` method                     | A read, answered without writing to the log.                                                                                          |
| `#[app::confirm]`                              | method                             | The caller confirms with a fresh passkey assertion (`412 CONFIRM_REQUIRED` until the client answers it).                              |
| `#[app::public]` / `#[app::public(rate = ..)]` | method                             | Callable without signing in.                                                                                                          |
| `#[app::every("1m")]`                          | `&mut self`, no args               | A timer the node runs (`<n>s`, `<n>m`, `<n>h`); `env::timer()` gives the tick.                                                        |
| `#[app::allow(app = "*")]` / `allow(system)`   | method                             | Another app in the same organization (`env::xcall*`), or the node itself, may call it.                                                |
| `#[app::action]`                               | fn taking `ctx: &mut ActionCtx`    | Leader-run work outside the log: `ctx.view`, `ctx.call`, `ctx.fetch` (outbound HTTP).                                                 |
| `#[app::error]`                                | enum, in the logic module          | Variant name = error code; named fields become `{ code, fields }` (`422 APP_ERROR`).                                                  |
| `#[app::event]`                                | enum, in the logic module          | Variant name = event name; owned, named fields.                                                                                       |
| `#[derive(Record)]` + `#[table(..)]`           | struct                             | A table row: `key`, `unique(..)`, `index(..)`, `count(..)`, `search = [..]`. Writes its own serde: do not also derive `Serialize`.    |
| `#[derive(AbiType)]`                           | serde struct or enum               | Writes the type's JSON shape into the ABI, so generated clients type it (otherwise `unknown`).                                        |

## Build, test, package

```bash
rustup target add wasm32-wasip2                                      # once
cargo test                                                           # TestApp: the built component on the real engine
mero-app-build . --out my-app.wasm                                   # the calimero:app component, ABI embedded
mero-app-build codegen --abi my-app.wasm --lang ts -o src/generated  # typed client (calimero-abi-codegen skill)
merod local                                                          # a three-node development cluster, mock attestation
```

`mero-app-build` and `mero-sign` ship prebuilt on every core release
(`mero-app-build_<target>.tar.gz`, checked against the release's `SHA256SUMS`). Package a signed
`.mpk` with core's `scripts/pack-component.py`, which signs through `mero-sign`.

## References

See `references/` for collections and tables, events, the env API, blobs, testing and upgrades. See
`rules/` for the attribute placement, derive and runtime rules the dispatcher enforces.

Core's own guide is the source of truth: <https://calimero-network.github.io/core/build/>.
