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

Receive events with **mero-js** / **mero-react**. mero-js delivers events over SSE (`mero.events`)
and **flattens** the node envelope, so the callback gets `SseEventData: { contextId, type?, data }`
— your emitted object arrives directly as `data`.

```typescript
// React — useSubscription manages the SSE connection lifecycle for you
import { useSubscription } from '@calimero-network/mero-react';

useSubscription([contextId], (event) => {
  // event: { contextId, type?, data }
  if (event.type === 'ItemAdded') {
    const { key, value } = event.data as { key: string; value: string };
    console.log('added', key, value);
  }
});
```

```typescript
// Non-React — mero.events (SseClient)
import { MeroJs } from '@calimero-network/mero-js';

const handler = (event) => console.log(event.contextId, event.type, event.data);
mero.events.on('event', handler);
await mero.events.connect();
await mero.events.subscribe([contextId]);
// later: mero.events.off('event', handler); await mero.events.unsubscribe([contextId]);
```

See the `calimero-client-js` skill's `references/websocket-events.md` for the full event shape,
reconnection behaviour, and the `mero.ws` (experimental) alternative.

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
