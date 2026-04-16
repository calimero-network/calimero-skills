# calimero-client-js — Agent Instructions

You are helping a developer connect a **browser or Node.js frontend** to a Calimero node
using `@calimero-network/mero-react` (preferred) or `@calimero-network/calimero-client`.

> **NOT this skill** if the developer is building the application logic that *runs on the
> node* in TypeScript — that is `calimero-sdk-js`. This skill is for the *client* side:
> auth, RPC calls, and WebSocket subscriptions from a browser or React app.

## Package versions

| Package | Notes |
|---|---|
| `@calimero-network/mero-react` | **Preferred for React apps.** Exports `MeroJs`, `useSubscription`, `MeroProvider`, hooks. |
| `@calimero-network/mero-js` | Core SDK. Zero deps. Used standalone in non-React contexts. |
| `@calimero-network/calimero-client` | Legacy client. Still works; new projects should prefer mero-react/mero-js. |

## Critical: mero-js v2 uses camelCase

All request field names changed from `snake_case` to `camelCase` in v2.

```typescript
// WRONG (v1):
{ context_id: '...', context_identity: '...' }

// CORRECT (v2 / mero-react):
{ contextId: '...', contextIdentity: '...' }
```

## React app pattern (mero-react) — recommended

### Install

```bash
pnpm add @calimero-network/mero-react
```

### Setup provider

```tsx
import { MeroProvider } from '@calimero-network/mero-react';

function App() {
  return (
    <MeroProvider nodeUrl="http://localhost:2428">
      <YourApp />
    </MeroProvider>
  );
}
```

### Call app methods

Generated clients (from abi-codegen) import `MeroJs` from `@calimero-network/mero-react`:

```typescript
import { MeroJs } from '@calimero-network/mero-react';

export class KvClient {
  constructor(
    private mero: MeroJs,
    private contextId: string,
    private executorPublicKey: string,
  ) {}

  async set(key: string, value: string): Promise<void> {
    await this.mero.rpc.execute({
      contextId: this.contextId,
      method: 'set',
      argsJson: { key, value },
      executorPublicKey: this.executorPublicKey,
    });
  }

  async get(key: string): Promise<string | null> {
    const response = await this.mero.rpc.execute({
      contextId: this.contextId,
      method: 'get',
      argsJson: { key },
      executorPublicKey: this.executorPublicKey,
    });
    return response as string | null;
  }
}
```

### Subscribe to events (mero-react hook)

```typescript
import { useSubscription } from '@calimero-network/mero-react';

// Subscribe to one or more contexts
useSubscription([contextId], (event: { contextId: string; data: unknown }) => {
  // event.data may be:
  // - { type: 'EventName', ...payload } for direct events
  // - { events: [{ kind: string, data: unknown }] } for execution event batches
  console.log('event:', event.data);
});

// Subscribe to multiple contexts (e.g. game + lobby simultaneously)
useSubscription([gameContextId, lobbyContextId], (event) => {
  console.log('from context:', event.contextId);
});
```

### Parsing execution event payloads

Events from `app::emit!()` arrive batched in an `events` array. Each entry has `kind` (the variant name) and `data` (the payload, possibly as a byte array):

```typescript
function decodeEventData(data: unknown): unknown {
  // If data is a number array, it's JSON-encoded bytes
  if (Array.isArray(data) && data.every(n => typeof n === 'number')) {
    return JSON.parse(new TextDecoder().decode(new Uint8Array(data)));
  }
  return data;
}

// In the subscription callback:
useSubscription([contextId], (event) => {
  const payload = event.data as any;
  if (Array.isArray(payload?.events)) {
    for (const e of payload.events) {
      const decoded = decodeEventData(e.data);
      console.log(e.kind, decoded); // e.g. "Inserted", { key: "...", value: "..." }
    }
  }
});
```

## Legacy calimero-client pattern

```typescript
import {
  rpcClient,
  getContextId,
  getExecutorPublicKey,
  getAppEndpointKey,
  setAppEndpointKey,
  setAccessToken,
  setRefreshToken,
  setContextAndIdentityFromJWT,
  WsSubscriptionsClient,
} from '@calimero-network/calimero-client';

// 1. Store auth tokens (after SSO or login)
setAppEndpointKey('http://localhost:2428');
setAccessToken(accessToken);
setRefreshToken(refreshToken);
setContextAndIdentityFromJWT(accessToken); // extracts contextId + executorPublicKey

// 2. Call an app method
const response = await rpcClient.execute<{ key: string }, string | null>({
  contextId: getContextId()!,
  method: 'get',
  argsJson: { key: 'hello' },
  executorPublicKey: getExecutorPublicKey()!,
});
console.log(response.result?.output);

// 3. Subscribe to events
const ws = new WsSubscriptionsClient(getAppEndpointKey()!, '/ws');
await ws.connect();
ws.subscribe([getContextId()!]);
ws.addCallback((event) => {
  if (event.type === 'ExecutionEvent') {
    for (const e of event.data.events) {
      console.log(e.kind, e.data);
    }
  }
});
```

## Core workflow

1. On startup: read SSO tokens from URL hash (if opened by Desktop), otherwise check `localStorage`, otherwise show login
2. Store tokens using storage helpers or the `MeroProvider` (handles this automatically)
3. Call app methods via the generated typed client or `mero.rpc.execute()`
4. Subscribe to events via `useSubscription` (React) or `WsSubscriptionsClient`

## Related skills

- **`calimero-core`** — JSON-RPC protocol spec, WebSocket event schemas, context/app/identity model
- **`calimero-desktop`** — SSO token passing from Calimero Desktop (URL hash flow)
- **`calimero-node`** — node setup if the developer is also running the node

## References

See `references/` for auth flow, RPC calls, WebSocket events, and SSO.
See `rules/` for camelCase API and token refresh requirements.
