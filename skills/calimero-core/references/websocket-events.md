# WebSocket Events

The Calimero node pushes real-time events to subscribers over WebSocket.

## Connect and subscribe

```text
ws://localhost:2428/ws
```

After connecting, send:

```json
{ "action": "subscribe", "contextIds": ["<context-id-1>", "<context-id-2>"] }
```

You can subscribe to multiple context IDs in one message.

---

## Event types

| Type             | When fired                                            | Payload                        |
| ---------------- | ----------------------------------------------------- | ------------------------------ |
| `ExecutionEvent` | App called `app::emit!()` (Rust) or `env.emit()` (JS) | `{ events: ExecutionEvent[] }` |
| `StateMutation`  | Any context member mutated shared state               | `{ newRoot: string }`          |

---

## ExecutionEvent schema

```typescript
interface WsMessage {
  contextId: string;
  type: 'ExecutionEvent';
  data: {
    events: Array<{
      kind: string; // matches Rust enum variant name or JS event name
      data: number[] | object; // byte array (UTF-8 JSON) or plain object
    }>;
  };
}
```

`data` is typically a UTF-8 JSON byte array when coming from a Rust app. Decode it:

```typescript
function decodeEventData(data: unknown): unknown {
  if (Array.isArray(data) && data.every((n) => typeof n === 'number')) {
    try {
      return JSON.parse(new TextDecoder().decode(new Uint8Array(data as number[])));
    } catch {
      return data; // leave as-is if not valid JSON
    }
  }
  return data;
}
```

Full consumption pattern:

```typescript
ws.onmessage = (msg) => {
  const envelope = JSON.parse(msg.data);
  if (envelope.type === 'ExecutionEvent') {
    for (const e of envelope.data.events) {
      const payload = decodeEventData(e.data);
      switch (e.kind) {
        case 'PostCreated':
          handlePostCreated(payload);
          break;
        case 'PostDeleted':
          handlePostDeleted(payload);
          break;
      }
    }
  }
  if (envelope.type === 'StateMutation') {
    // A peer mutated shared state — refetch data if needed
    refreshData();
  }
};
```

---

## StateMutation schema

```typescript
interface WsMessage {
  contextId: string;
  type: 'StateMutation';
  data: {
    newRoot: string; // hex hash of the new CRDT state root after merge
  };
}
```

Use `StateMutation` to know when to refetch state from the node — it fires on every mutation from
any member, including the local node's own mutations.

---

## Unsubscribe

```json
{ "action": "unsubscribe", "contextIds": ["<context-id>"] }
```

---

## Emitting events from Rust

```rust
#[app::event]
pub enum Event<'a> {
    PostCreated { title: &'a str },
    PostDeleted { id: u32 },
}

#[app::logic]
impl AppState {
    pub fn create_post(&mut self, title: String) -> app::Result<()> {
        // ...
        app::emit!(Event::PostCreated { title: &title });
        Ok(())
    }
}
```

The `kind` field in the WebSocket message will be `"PostCreated"` or `"PostDeleted"`.

## Emitting events from TypeScript (SDK JS)

```typescript
import * as env from '@calimero-network/calimero-sdk-js/env';

set(key: string, value: string): void {
  this.items.set(key, value);
  env.emit({ kind: 'ItemSet', data: { key, value } });
}
```
