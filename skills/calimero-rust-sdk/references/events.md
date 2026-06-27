# Events

Events are emitted from app logic and pushed in real-time to all context members subscribed via
WebSocket.

## Define an event type

Annotate the enum with `#[app::event]`. The macro injects `#[derive(Serialize)]` and the
`#[serde(crate = "...")]` / tagged-union attributes and implements the `AppEvent` trait — do **not**
hand-write a `Serialize`/`Deserialize` derive yourself.

```rust
use calimero_sdk::app;

#[app::event]
pub enum Event<'a> {
    ItemAdded { key: &'a str, value: &'a str },
    ItemRemoved { key: &'a str },
    MemberJoined { identity: &'a str },
}
```

`#[app::event]` must be applied to a **public enum** (a struct is rejected at compile time). Borrowed
fields (`&'a str`) are common and let you emit without cloning.

## Declare the event type on state

The state struct names its event type via the `emits = ...` argument to `#[app::state]`:

```rust
#[app::state(emits = for<'a> Event<'a>)]
pub struct AppState {
    items: UnorderedMap<String, LwwRegister<String>>,
}
```

## Emit an event

Use `app::emit!(...)`. Public methods return `app::Result<T>`; fallible collection ops use `?`.

```rust
#[app::logic]
impl AppState {
    pub fn add_item(&mut self, key: String, value: String) -> app::Result<()> {
        self.items.insert(key.clone(), LwwRegister::new(value.clone()))?;

        app::emit!(Event::ItemAdded {
            key: &key,
            value: &value,
        });

        Ok(())
    }
}
```

## Rules

- Events are **fire-and-forget** — they are not persisted in state
- Events are sent to all members currently subscribed to the context WebSocket
- The event enum must be annotated with `#[app::event]` (this provides serialization + `AppEvent`)
- Emit after state mutation, not before
- Multiple events can be emitted in one method call
- For a callback handler, emit a tuple: `app::emit!((Event::ItemAdded { .. }, "handler_name"))`

## Subscribing from a client

```typescript
// calimero-client-js
client.subscribe(contextId, (event) => {
  console.log(event);
});
```
