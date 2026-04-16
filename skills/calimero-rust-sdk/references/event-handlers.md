# Event Handlers

Event handlers are app methods that run **automatically on every peer** when an event is emitted
with a named handler. The emitting peer runs the handler immediately; all other peers run it when
they receive the event during sync.

This lets you trigger side effects (CRDT updates, counters, bookkeeping) that happen consistently on
every node without requiring explicit RPC calls.

---

## Syntax

Pass a string method name as the second element of a tuple in `app::emit!`:

```rust
// Without handler (normal event, subscribers only):
app::emit!(Event::Updated { key: &key, value: &value });

// With handler (also calls self.update_handler(key, value) on every peer):
app::emit!((Event::Updated { key: &key, value: &value }, "update_handler"));
```

The handler method must exist on the same `#[app::logic]` impl with matching arguments.

---

## Full example

```rust
use calimero_sdk::app;
use calimero_sdk::borsh::{BorshDeserialize, BorshSerialize};
use calimero_storage::collections::{Counter, LwwRegister, UnorderedMap};

#[app::state(emits = for<'a> Event<'a>)]
#[derive(Debug, BorshSerialize, BorshDeserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
pub struct AppState {
    items:           UnorderedMap<String, LwwRegister<String>>,
    handler_counter: Counter,
}

#[app::event]
pub enum Event<'a> {
    Inserted { key: &'a str, value: &'a str },
    Updated  { key: &'a str, value: &'a str },
    Removed  { key: &'a str },
}

#[app::logic]
impl AppState {
    #[app::init]
    pub fn init() -> AppState {
        AppState {
            items:           UnorderedMap::new(),
            handler_counter: Counter::new(),
        }
    }

    pub fn set(&mut self, key: String, value: String) -> app::Result<()> {
        if self.items.contains(&key)? {
            app::emit!((Event::Updated { key: &key, value: &value }, "update_handler"));
        } else {
            app::emit!((Event::Inserted { key: &key, value: &value }, "insert_handler"));
        }
        self.items.insert(key, value.into())?;
        Ok(())
    }

    pub fn remove(&mut self, key: &str) -> app::Result<Option<String>> {
        app::emit!((Event::Removed { key }, "remove_handler"));
        Ok(self.items.remove(key)?.map(|v| v.get().clone()))
    }

    // --- Handlers (called automatically on every peer when event fires) ---

    pub fn insert_handler(&mut self, key: &str, value: &str) -> app::Result<()> {
        app::log!("insert_handler: key={}, value={}", key, value);
        self.handler_counter.increment()?;
        Ok(())
    }

    pub fn update_handler(&mut self, key: &str, value: &str) -> app::Result<()> {
        app::log!("update_handler: key={}, value={}", key, value);
        self.handler_counter.increment()?;
        Ok(())
    }

    pub fn remove_handler(&mut self, key: &str) -> app::Result<()> {
        app::log!("remove_handler: key={}", key);
        self.handler_counter.increment()?;
        Ok(())
    }

    pub fn get_handler_count(&self) -> app::Result<u64> {
        Ok(self.handler_counter.value()?)
    }
}
```

---

## Handler constraints

Handlers must be:

- **Commutative** — order of execution should not matter
- **Idempotent** — safe to replay (sync may re-deliver events during catch-up)
- **Pure w.r.t. CRDT state** — only mutate CRDT fields; avoid logic that depends on exact ordering

Handlers receive the same arguments as the event variant fields. The method signature must match
exactly.

---

## When to use handlers vs regular methods

| Use handler when                                         | Use regular method when                      |
| -------------------------------------------------------- | -------------------------------------------- |
| You want something to happen on every node automatically | You want a node to call something explicitly |
| Maintaining derived CRDT counters / aggregates           | One-off mutations triggered by one actor     |
| Bookkeeping that must stay consistent across peers       | Operations that require authorization checks |
