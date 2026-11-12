# Rule: where the app attributes go

- `#[app::state(version = N)]` goes on the **struct**; `#[app::logic]` on its **`impl` block**.
- `#[app::init]` is one method of that `impl`: `pub fn init() -> app::Result<Self>`, usually
  `Ok(Self::load())`.
- The `#[app::error]` enum and the `#[app::event]` enum live in the **same module** as
  `#[app::logic]`. Declared elsewhere, they are invisible to the ABI. One of each per module.
- Every error and event variant has **named** fields (`NotFound { id: String }`) or none (`Closed`).
  A tuple variant (`NotFound(String)`) is a compile error.
- There is no `emits = ..` on the state, no `#[app::private]` and no `app::emit!`: emit with
  `env::emit(Event::X { .. }, Audience::All)?`.

```rust
use calimero_sdk::prelude::*;

#[app::state(version = 1)] // on the struct
pub struct Limit {
    value: Cell<u32>,
}

#[app::error] // same module as #[app::logic]
pub enum Error {
    TooBig { max: u32 },
}

#[app::event]
pub enum Event {
    Changed { value: u32 },
}

#[app::logic] // on the impl
impl Limit {
    #[app::init]
    pub fn init() -> app::Result<Self> {
        Ok(Self::load())
    }

    pub fn set(&mut self, value: u32) -> app::Result<()> {
        guards::require_member()?;
        if value > 1000 {
            app::bail!(Error::TooBig { max: 1000 });
        }
        self.value.set(&value)?;
        env::emit(Event::Changed { value }, Audience::All)?;
        Ok(())
    }
}
```
