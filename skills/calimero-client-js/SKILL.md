# calimero-client-js — Agent Instructions

You are helping a developer connect a **browser or Node.js frontend** to a Calimero node
using `@calimero-network/calimero-client` or `@calimero-network/mero-js`.

> **NOT this skill** if the developer is building the application logic that *runs on the
> node* in TypeScript — that is `calimero-sdk-js` (`@calimero-network/calimero-sdk-js`).
> This skill is for the *client* side: auth, RPC calls, and WebSocket subscriptions from
> a browser or backend service.

## Package versions

| Package | Version | Notes |
| --- | --- | --- |
| `@calimero-network/calimero-client` | latest | Stable client for browser/Node — auth, RPC, WebSocket |
| `@calimero-network/mero-js` | `>=2.0.0-beta.1` | v2 API — all request fields are **camelCase** |

**Which to use:** new projects should prefer `@calimero-network/mero-js` v2. If you are
maintaining an existing codebase that uses `calimero-client`, check for snake_case field
names before migrating — do not mix both packages in the same project.

## Critical: mero-js v2 uses camelCase

v2 changed all request field names from `snake_case` to `camelCase`.

```typescript
// WRONG (v1 / old):
{ context_id: '...', context_identity: '...' }

// CORRECT (v2):
{ contextId: '...', contextIdentity: '...' }
```

This applies to `GenerateClientKeyRequest` and all other request types.

## Install

```bash
pnpm add @calimero-network/calimero-client
# or
pnpm add @calimero-network/mero-js
```

## Core workflow

1. On startup: read SSO tokens from URL hash (if opened by Desktop), otherwise check `localStorage` for existing session, otherwise show login
2. Store tokens using the provided storage helpers (`setAppEndpointKey`, `setAccessToken`, etc.)
3. Call app methods via the `rpcClient` singleton using `rpcClient.execute()`
4. Subscribe to events via `WsSubscriptionsClient`

## Minimal working example

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

// 3. Subscribe to real-time events
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

## References

See `references/` for auth flow, RPC calls, WebSocket events, and SSO.
See `rules/` for camelCase API and token refresh requirements.
