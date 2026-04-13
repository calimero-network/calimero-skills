# WebSocket Events

Subscribe to real-time events emitted by the application running on the node.

## Event types

The node sends two kinds of events to subscribers:

| type | when | payload |
|---|---|---|
| `StateMutation` | Another member mutated shared state | `{ newRoot: string }` |
| `ExecutionEvent` | App emitted `app::emit!()` | `{ events: ExecutionEvent[] }` |

An `ExecutionEvent` entry: `{ kind: string; data: any }` where `kind` matches the Rust event variant name and `data` may be a byte array (UTF-8 JSON) or a plain object.

---

## mero-react: useSubscription hook (preferred for React)

```typescript
import { useSubscription } from '@calimero-network/mero-react';

function MyComponent({ contextId }: { contextId: string }) {
  useSubscription([contextId], (event: { contextId: string; data: unknown }) => {
    const payload = event.data as any;

    // ExecutionEvent: data has an `events` array
    if (Array.isArray(payload?.events)) {
      for (const e of payload.events) {
        const data = decodeEventData(e.data);
        switch (e.kind) {
          case 'Inserted': console.log('inserted', data); break;
          case 'Removed':  console.log('removed', data); break;
        }
      }
    }
  });
}

// Byte-array payloads are JSON-encoded; decode them:
function decodeEventData(data: unknown): unknown {
  if (Array.isArray(data) && data.every(n => typeof n === 'number')) {
    try {
      return JSON.parse(new TextDecoder().decode(new Uint8Array(data)));
    } catch {
      return data;
    }
  }
  return data;
}
```

## Subscribe to multiple contexts

```typescript
// Subscribe to game context + lobby context simultaneously
useSubscription([gameContextId, lobbyContextId], (event) => {
  console.log('event from context:', event.contextId);
});
```

---

## Legacy calimero-client: WsSubscriptionsClient

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
      console.log(e.kind, e.data);
    }
  }
  if (event.type === 'StateMutation') {
    refreshDataFromNode();
  }
});
```

Cleanup:
```typescript
ws.removeCallback(myCallback);
ws.unsubscribe([contextId]);
ws.disconnect();
```

---

## React hook for legacy client

```typescript
import { useEffect } from 'react';
import { WsSubscriptionsClient, getAppEndpointKey, getContextId } from '@calimero-network/calimero-client';

function useNodeEvents(onEvent: (event: any) => void) {
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

---

## Connection notes

- `WsSubscriptionsClient` does **not** reconnect automatically — handle reconnect manually
- `useSubscription` from `mero-react` manages the connection lifecycle for you
- WebSocket tokens are **not** auto-refreshed unlike `rpcClient` HTTP calls
