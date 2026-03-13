# WebSocket Events

Subscribe to real-time events emitted by the application running on the node.

## Connect and subscribe

```typescript
import { WsSubscriptionsClient } from '@calimero-network/calimero-client';

const nodeUrl = getStorageAppEndpointKey() ?? 'http://localhost:2428';
const jwt = getJWTObject();

const ws = new WsSubscriptionsClient(nodeUrl, '/ws', jwt?.access_token);

ws.subscribe([contextId], (event) => {
  console.log('Event received:', event);
  // event.data contains the serialized app event payload
});
```

## Handling specific event types

```typescript
interface AppEvent {
  type: 'ItemAdded' | 'ItemRemoved' | 'MemberJoined';
  key?: string;
  value?: string;
  identity?: string;
}

ws.subscribe([contextId], (event) => {
  const appEvent = event.data as AppEvent;

  switch (appEvent.type) {
    case 'ItemAdded':
      addItemToUI(appEvent.key!, appEvent.value!);
      break;
    case 'ItemRemoved':
      removeItemFromUI(appEvent.key!);
      break;
  }
});
```

## Cleanup

```typescript
// Unsubscribe when component unmounts
ws.unsubscribe([contextId]);

// Or close connection entirely
ws.close();
```

## React hook pattern

```typescript
useEffect(() => {
  const ws = new WsSubscriptionsClient(nodeUrl, '/ws', token);
  ws.subscribe([contextId], handleEvent);

  return () => {
    ws.unsubscribe([contextId]);
  };
}, [contextId, token]);
```
