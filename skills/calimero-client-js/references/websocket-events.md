# Event subscriptions

Subscribe to real-time events emitted by the application running on the node.

mero-js delivers events over **SSE** by default (`mero.events`, the `SseClient`). A `WsClient`
(`mero.ws`) also exists but is **experimental** — prefer SSE for production. In React,
`useSubscription` wraps `mero.events`.

## Event shape delivered to your callback

Both `mero.events` and `useSubscription` emit a flattened event:

```typescript
interface SseEventData {
  contextId: string;
  type?: string; // event discriminator (e.g. "AppVersionChanged"), if tagged
  data: unknown; // payload — byte-array payloads are auto-decoded to JSON
}
```

> The client already decodes byte-array (`number[]`) payloads from UTF-8 JSON before invoking your
> callback, so `data` is normally a plain object. The raw node-level `StateMutation` /
> `ExecutionEvent` envelope and its `events[]` array (see the `calimero-core` skill) are a
> node-protocol detail; what reaches your callback is the flattened `{ contextId, type, data }`.

---

## mero-react: useSubscription hook (preferred for React)

```typescript
import { useSubscription } from '@calimero-network/mero-react';

function MyComponent({ contextId }: { contextId: string }) {
  // callback receives SseEventData: { contextId, type?, data }
  useSubscription([contextId], (event) => {
    // Simplest, most robust pattern: any event for this context means
    // "something changed" — refetch state from the node.
    refreshFromNode();

    // If you need the payload:
    console.log(event.type, event.data);
  });
}
```

The most common and most robust pattern (used by the foundation app) is to treat any event for a
context as a "refetch" trigger rather than diffing the payload — see `useChatRoom` in the foundation
app.

## Subscribe to multiple contexts

```typescript
// Subscribe to game context + lobby context simultaneously
useSubscription([gameContextId, lobbyContextId], (event) => {
  console.log('event from context:', event.contextId);
});
```

`useSubscription` manages the SSE connection lifecycle (connect, re-subscribe on reconnect, cleanup
on unmount) for you.

---

## mero-js (non-React): mero.events

```typescript
import { MeroJs } from '@calimero-network/mero-js';

const mero = new MeroJs({ baseUrl });
// …authenticate…

const handler = (event: { contextId: string; type?: string; data: unknown }) => {
  console.log(event.contextId, event.type, event.data);
};

mero.events.on('event', handler);
mero.events.on('error', (err) => console.error('SSE error', err));
await mero.events.connect();
await mero.events.subscribe([contextId]);

// Cleanup
mero.events.off('event', handler);
await mero.events.unsubscribe([contextId]);
mero.close(); // closes SSE + WS clients
```

### Typed convenience for app-version changes

```typescript
const unsubscribe = mero.events.onAppVersionChanged((e) => {
  // e: { contextId, fromVersion?, toVersion? }
  console.log('app upgraded', e.fromVersion, '→', e.toVersion);
});
// later: unsubscribe();
```

---

## Connection notes

- `useSubscription` (mero-react) manages the connection lifecycle for you.
- `mero.events` (SSE) reconnects automatically and re-subscribes to its tracked context IDs after a
  reconnect.
- `mero.ws` (`WsClient`) is **experimental** — use `mero.events` (SSE) in production.

---

> **DEPRECATED:** `@calimero-network/calimero-client`'s `WsSubscriptionsClient`
> (`new WsSubscriptionsClient(url, '/ws')`, `.addCallback`, `event.type === 'ExecutionEvent'`,
> `event.data.events`) is **forbidden** in generated apps. Replace it with `useSubscription` (React)
> or `mero.events` (mero-js); both deliver the flattened `{ contextId, type, data }` shape shown
> above.
