# WebSocket Events

Subscribe to real-time events emitted by the application running on the node.

## Event types

The node sends two kinds of events to subscribers:

| type | when | payload |
|---|---|---|
| `StateMutation` | Another member mutated shared state | `{ newRoot: string }` |
| `ExecutionEvent` | App emitted `app::emit!()` | `{ events: ExecutionEvent[] }` |

An `ExecutionEvent` has: `{ kind: string; data: any }` where `kind` matches the Rust event variant name.

---

## Connect and subscribe

```typescript
import {
  WsSubscriptionsClient,
  getAppEndpointKey,
  getContextId,
} from '@calimero-network/calimero-client';

const nodeUrl = getAppEndpointKey()!;
const ws = new WsSubscriptionsClient(nodeUrl, '/ws');

// Connect first, then subscribe and add callback
await ws.connect();
ws.subscribe([getContextId()!]);
ws.addCallback((event) => {
  console.log('Event received:', event);
});
```

---

## Handling ExecutionEvents from app logic

```typescript
import type {
  NodeEvent,
  ExecutionEventPayload,
  StateMutationPayload,
} from '@calimero-network/calimero-client';

ws.addCallback((event: NodeEvent) => {
  if (event.type === 'ExecutionEvent') {
    for (const e of event.data.events) {
      // e.kind matches the Rust event variant name, e.g. 'ItemAdded'
      // e.data contains the event payload
      switch (e.kind) {
        case 'ItemAdded':
          console.log('Item added:', e.data);
          addItemToUI(e.data.key, e.data.value);
          break;
        case 'ItemRemoved':
          removeItemFromUI(e.data.key);
          break;
      }
    }
  }

  if (event.type === 'StateMutation') {
    // Another member changed shared state — refresh data from node
    console.log('State root changed:', event.data.newRoot);
    refreshDataFromNode();
  }
});
```

---

## Subscribe to multiple contexts

```typescript
ws.subscribe([contextId1, contextId2]);
// Events include event.contextId to identify which context emitted them
```

---

## Cleanup

```typescript
// Remove a specific callback
ws.removeCallback(myCallback);

// Unsubscribe from specific contexts
ws.unsubscribe([contextId]);

// Close connection entirely
ws.disconnect();
```

---

## React hook pattern

```typescript
import { useEffect } from 'react';
import { WsSubscriptionsClient, getAppEndpointKey, getContextId } from '@calimero-network/calimero-client';

function useNodeEvents(onEvent: (event: NodeEvent) => void) {
  useEffect(() => {
    const nodeUrl = getAppEndpointKey();
    const contextId = getContextId();
    if (!nodeUrl || !contextId) return;

    const ws = new WsSubscriptionsClient(nodeUrl, '/ws');

    ws.connect().then(() => {
      ws.subscribe([contextId]);
      ws.addCallback(onEvent);
    });

    return () => {
      ws.removeCallback(onEvent);
      ws.unsubscribe([contextId]);
      ws.disconnect();
    };
  }, [onEvent]);
}
```
