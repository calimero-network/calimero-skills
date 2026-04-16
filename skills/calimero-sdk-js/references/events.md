# Events

Events let your app push real-time notifications to all context members. They are emitted during
mutation methods and received by clients via WebSocket.

## Emitting events

```typescript
import { emit, emitWithHandler } from '@calimero-network/calimero-sdk-js';

// Simple event — clients receive it and dispatch themselves
emit({ type: 'ItemAdded', key: 'foo', value: 'bar' });

// Event with a named handler — clients call `onItemAdded(event)` if defined
emitWithHandler({ type: 'ItemAdded', key: 'foo' }, 'onItemAdded');
```

Events can only be emitted inside mutation methods (not `@View()` methods).

## Receiving events on the client

Clients use `WsSubscriptionsClient` from `@calimero-network/calimero-client`:

```typescript
import {
  WsSubscriptionsClient,
  getAppEndpointKey,
  getContextId,
} from '@calimero-network/calimero-client';

const ws = new WsSubscriptionsClient(getAppEndpointKey()!, '/ws');
await ws.connect();
ws.subscribe([getContextId()!]);

ws.addCallback((event) => {
  if (event.type === 'ExecutionEvent') {
    for (const e of event.data.events) {
      // e.kind — matches the `type` field from emit()
      // e.data — the rest of the emitted object
      console.log(e.kind, e.data);
    }
  }
});
```

## Event typing (recommended)

Define a discriminated union to type your events:

```typescript
type AppEvent =
  | { type: 'ItemAdded'; key: string; value: string }
  | { type: 'ItemRemoved'; key: string };

// Emit
emit({ type: 'ItemAdded', key: 'foo', value: 'bar' } satisfies AppEvent);
```

## Important

- Events are best-effort — clients may miss them if disconnected
- Do not rely on events for state consistency — use RPC calls to query current state
- Emitting from a `@View()` method is not supported
