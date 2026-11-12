# Events

An app declares one `#[app::event]` enum in its `#[app::logic]` module and emits its variants with
`env::emit`. Events are delivered once the call **commits**: a failed call emits nothing.

```rust
use calimero_sdk::prelude::*;

#[app::state(version = 1)]
pub struct Rooms {
    bookings: UnorderedMap<String, String>,
}

#[app::event]
pub enum Event {
    Booked { id: String, room_id: String, start: u64 },
    Cancelled { id: String },
}

#[app::logic]
impl Rooms {
    #[app::init]
    pub fn init() -> app::Result<Self> {
        Ok(Self::load())
    }

    pub fn book(&mut self, room_id: String, start: u64) -> app::Result<String> {
        let me = guards::require_member()?;
        let id = env::unique_id();
        let _old = self.bookings.insert(&id, &me)?;
        env::emit(Event::Booked { id: id.clone(), room_id, start }, Audience::All)?;
        Ok(id)
    }
}
```

- Variant name = event name (`Booked`); fields are camelCase on the wire, and `u64`/`i64` travel as
  decimal strings.
- Every field is **named** and **owned** (`String`, not `&str`). Tuple variants are a compile error.
- `env::emit_raw(name, &data, audience)` emits any serde value under a name.

## Audiences

| `Audience`               | Who receives it                     |
| ------------------------ | ----------------------------------- |
| `Audience::All`          | everyone who can read the app       |
| `Audience::Caller`       | the caller only                     |
| `Audience::Accounts(..)` | the listed account ids              |
| `Audience::Team(id)`     | the members of one team             |
| `Audience::Org`          | the app's organization              |
| `Audience::OrgAdmins`    | the organization's admins and owner |

## Receiving them

Clients follow an instance's events as a stream of `{ id, kind, data }` (`kind` the variant name).
With mero-js: `client.events(appId, from?, signal?)`, or the generated client's `svc.events()` (see
the `calimero-client-js` and `calimero-abi-codegen` skills). There are no event handlers that run
app code on other nodes: every replica applies the leader's changes, so there is nothing to react to
inside the app.
