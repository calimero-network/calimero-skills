# calimero-client-js — Agent Instructions

You are helping a developer connect a **browser or Node.js frontend** to a Calimero node using
`@calimero-network/mero-react` (React apps) or `@calimero-network/mero-js` (non-React).

> **NOT this skill** if the developer is building the application logic that _runs on the node_ in
> TypeScript — that is `calimero-sdk-js`. This skill is for the _client_ side: auth, RPC calls, and
> event subscriptions from a browser or React app.

## Package versions

| Package                             | Notes                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `@calimero-network/mero-react`      | **The path for React apps.** Re-exports everything from `mero-js` plus `MeroProvider`, `useMero`, `useSubscription`, and the admin hooks. |
| `@calimero-network/mero-js`         | Core SDK. Exposes `MeroJs` (`.rpc`, `.admin`, `.auth`, `.events`). Used standalone in non-React contexts. |

> **DEPRECATED — do not use:** `@calimero-network/calimero-client` (the old
> `rpcClient` / `WsSubscriptionsClient` / `getContextId` / `setAccessToken`
> helpers). It is **forbidden** in generated apps and is not how Calimero 0.11
> works. Use `mero-react` / `mero-js` for everything: auth, RPC, and events. A
> short DEPRECATED reference appears at the end of this file only so you can
> recognise and migrate old code — never write new code against it.

## Critical: mero-js v2 uses camelCase

All request field names changed from `snake_case` to `camelCase` in v2.

```typescript
// WRONG (v1):
{ context_id: '...', context_identity: '...' }

// CORRECT (v2 / mero-react):
{ contextId: '...', contextIdentity: '...' }
```

## React app pattern (mero-react)

### Install

```bash
pnpm add @calimero-network/mero-react
```

### Setup provider

`MeroProvider` does **not** take a `nodeUrl` prop — the node is chosen at
login time (the provider drives the auth-redirect flow and stores the node URL).
Configure it with the app `mode` and your package identifiers:

```tsx
import { AppMode, MeroProvider } from '@calimero-network/mero-react';

function App() {
  return (
    <MeroProvider
      mode={AppMode.MultiContext}                 // or AppMode.SingleContext
      packageName={import.meta.env.VITE_PACKAGE_NAME}
      registryUrl={import.meta.env.VITE_REGISTRY_URL}
    >
      <YourApp />
    </MeroProvider>
  );
}
```

`MeroProviderProps`: `mode` (required), `packageName`, `packageVersion`,
`registryUrl`, `timeoutMs` (default 30000), `allowedNodeUrls`, `tokenStore`.

### Get the SDK handle with useMero

```typescript
import { useMero } from '@calimero-network/mero-react';

const {
  mero,             // MeroJs instance (null until connected)
  isAuthenticated,
  isOnline,
  nodeUrl,
  applicationId,
  contextId,
  contextIdentity,
  connectToNode,    // (url) => starts the login redirect
  logout,
  isLoading,
} = useMero();
```

### Call app methods

Generated clients (from abi-codegen) import `MeroJs` from `@calimero-network/mero-react`.
`mero.rpc.execute()` returns the method's **output directly** (not a
`{ result: { output } }` envelope) and **throws** an `RpcError` on failure:

```typescript
import { MeroJs } from '@calimero-network/mero-react';

export class KvClient {
  constructor(
    private mero: MeroJs,
    private contextId: string,
    private executorPublicKey: string   // kept for back-compat; ignored by the server
  ) {}

  async set(key: string, value: string): Promise<void> {
    await this.mero.rpc.execute({
      contextId: this.contextId,
      method: 'set',
      argsJson: { key, value },
    });
  }

  async get(key: string): Promise<string | null> {
    const output = await this.mero.rpc.execute<string | null>({
      contextId: this.contextId,
      method: 'get',
      argsJson: { key },
    });
    return output;            // already the unwrapped output
  }
}
```

### Subscribe to events (mero-react hook)

The callback receives `SseEventData` — `{ contextId, type?, data }` — where
`data` is already byte-decoded to JSON by the client. The simplest, most robust
pattern (used by the foundation app) is to treat any event for a context as a
"refetch" trigger rather than diffing payloads:

```typescript
import { useSubscription } from '@calimero-network/mero-react';

// Subscribe to one or more contexts; refetch state on any event
useSubscription([contextId], (event) => {
  // event: { contextId, type?, data }
  refreshFromNode();
});

// Subscribe to multiple contexts (e.g. game + lobby simultaneously)
useSubscription([gameContextId, lobbyContextId], (event) => {
  console.log('from context:', event.contextId);
});
```

See `references/websocket-events.md` for the event shape and the standalone
`mero.events` (SSE) API.

## Non-React pattern (mero-js standalone)

In a non-React context, construct `MeroJs` directly and use the same
`.rpc` / `.admin` / `.events` surface:

```typescript
import { MeroJs } from '@calimero-network/mero-js';

const mero = new MeroJs({ baseUrl: 'http://localhost:2528' }); // node HTTP/RPC port (2528, not the 2428 P2P swarm port)
// authenticate (or restore tokens via a tokenStore / setTokenData)…

const output = await mero.rpc.execute<string | null>({
  contextId,
  method: 'get',
  argsJson: { key: 'hello' },
});

mero.events.on('event', (e) => {
  // e: { contextId, type?, data }
  console.log(e.contextId, e.data);
});
await mero.events.connect();
await mero.events.subscribe([contextId]);
```

## Core workflow

1. On startup: the `MeroProvider` (mero-react) handles auth automatically —
   it parses the auth-callback hash (used by both Desktop SSO and web login)
   via `parseAuthCallback`, stores tokens, and restores an existing session.
2. Read connection state from `useMero()` (`isAuthenticated`, `mero`, `contextId`, …).
3. Call app methods via the generated typed client or `mero.rpc.execute()`.
4. Subscribe to events via `useSubscription` (React) or `mero.events` (mero-js).

---

## DEPRECATED: `@calimero-network/calimero-client`

> The legacy client below is **forbidden** in generated apps and does not match
> Calimero 0.11. It is shown only so you can recognise and migrate old code.
> Translate every one of these into the mero-react / mero-js equivalents above.

| Legacy (`calimero-client`)                       | Replacement (`mero-react` / `mero-js`)                    |
| ------------------------------------------------ | --------------------------------------------------------- |
| `rpcClient.execute(...)` → `response.result.output` | `mero.rpc.execute(...)` returns the output directly (throws `RpcError` on error) |
| `WsSubscriptionsClient` / `.addCallback`         | `useSubscription([ctx], cb)` (React) or `mero.events`     |
| `getContextId()` / `getExecutorPublicKey()`      | `useMero().contextId` / `mero.admin.getContextIdentitiesOwned(ctx)` |
| `getAppEndpointKey()` / `setAppEndpointKey()`    | `useMero().nodeUrl` / `getNodeUrl()` / `setNodeUrl()`     |
| `setAccessToken` / `setRefreshToken` / `setContextAndIdentityFromJWT` | `MeroProvider` (auto via `parseAuthCallback`) |
| `clientLogout()`                                 | `useMero().logout()`                                       |

## Related skills

- **`calimero-core`** — JSON-RPC protocol spec, WebSocket event schemas, context/app/identity model
- **`calimero-desktop`** — SSO token passing from Calimero Desktop (URL hash flow)
- **`calimero-node`** — node setup if the developer is also running the node

## References

See `references/` for auth flow, RPC calls, event subscriptions, and SSO (all
on mero-react / mero-js). Multi-user and admin topics
(mero-js v2.5 / Calimero 0.11, all camelCase):

- `invitations-and-joins.md` — create/share an invitation → join a namespace + its contexts
- `group-upgrades-and-migrations.md` — `upgradeGroup`, migration status, cascade, retry (0.11)
- `capabilities-and-access-control.md` — member capability bitmask + `CAPABILITIES`/`hasCap`
- `metadata.md` — group/member/context metadata (display names) + size limits
- `aliases.md` — human-readable names for context/application/identity IDs
- `blobs-and-context-identity.md` — content-addressed blobs + choosing an executor identity

See `rules/` for camelCase API and token refresh requirements.
