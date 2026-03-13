# Events

Events are emitted from app logic and pushed in real-time to all context members subscribed via WebSocket.

## Define an event type

```rust
use calimero_sdk::app;
use calimero_sdk::serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[serde(crate = "calimero_sdk::serde")]
pub enum AppEvent {
    ItemAdded { key: String, value: String },
    ItemRemoved { key: String },
    MemberJoined { identity: String },
}
```

## Emit an event

```rust
#[app::logic]
impl AppState {
    pub fn add_item(&mut self, key: String, value: String) -> Result<(), String> {
        self.items.insert(key.clone(), value.clone());

        app::emit!(AppEvent::ItemAdded {
            key,
            value,
        });

        Ok(())
    }
}
```

## Rules

- Events are **fire-and-forget** — they are not persisted in state
- Events are sent to all members currently subscribed to the context WebSocket
- The event type must implement `Serialize` (from `calimero_sdk::serde`)
- Emit after state mutation, not before
- Multiple events can be emitted in one method call

## Subscribing from a client

```typescript
// calimero-client-js
client.subscribe(contextId, (event) => {
  console.log(event);
});
```
