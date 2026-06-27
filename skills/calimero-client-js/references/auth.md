# Authentication

Auth is handled by `MeroProvider` (mero-react) — it drives the login redirect, consumes the auth
callback, persists tokens, and restores existing sessions. You almost never store tokens by hand.

## How it works

1. **Login redirect.** `connectToNode(url)` (from `useMero()`) sends the user to the node's auth
   page (`<nodeUrl>/auth/login?...`) with a `callback-url` back to your app.
2. **Callback.** The node redirects back with tokens + identifiers in the URL hash. On first render
   `MeroProvider` runs `parseAuthCallback(window.location.href)`, validates the `node_url` against
   the node login was initiated with (and `allowedNodeUrls`), stores the tokens, then strips the
   hash.
3. **Session restore.** On later loads `MeroProvider` restores tokens from its token store
   (`LocalStorageTokenStore` by default) and verifies them by calling `mero.admin.getContexts()`.

## Auth-callback hash parameters

`parseAuthCallback` reads these from the URL hash:

| Parameter          | Maps to                        |
| ------------------ | ------------------------------ |
| `access_token`     | access token (required)        |
| `refresh_token`    | refresh token                  |
| `node_url`         | node URL to connect to         |
| `application_id`   | installed application id       |
| `context_id`       | context the token is scoped to |
| `context_identity` | executor public key (identity) |

> The same hash format is used by **both** web login and Calimero Desktop SSO. Do **not** parse or
> strip a token-bearing hash yourself — that races `MeroProvider` and leaves tokens in the wrong
> place (every call then 401s). See `sso.md`.

---

## Reading auth state — useMero

```typescript
import { useMero } from '@calimero-network/mero-react';

const {
  isAuthenticated,
  isOnline,
  mero, // MeroJs instance, or null
  nodeUrl,
  applicationId,
  contextId,
  contextIdentity, // executor public key from the callback
  connectToNode,
  logout,
  isLoading,
} = useMero();
```

Gate UI on `isLoading` first (auth is being restored), then `isAuthenticated`.

---

## Logging in (no Desktop)

```typescript
const { connectToNode } = useMero();

// Sends the user to the node's auth page; on success they return authenticated.
// Use the node's HTTP/RPC port (default 2528) — 2428 is the P2P swarm port.
connectToNode('http://localhost:2528');
```

Or use the prebuilt `ConnectButton` / `LoginModal` from mero-react.

---

## Logout

```typescript
const { logout } = useMero();

// Clears tokens + all mero-react storage and resets provider state.
logout();
```

---

## Persistence helpers (mero-react storage)

mero-react exports localStorage helpers for the node URL / app id / context that the provider also
uses. You rarely need these directly (the SSO bootstrap uses `setNodeUrl` / `setApplicationId` to
pre-fill a token-less cold open):

```typescript
import {
  getNodeUrl,
  setNodeUrl,
  clearNodeUrl,
  getApplicationId,
  setApplicationId,
  clearApplicationId,
  getContextId,
  setContextId,
  clearContextId,
  getContextIdentity,
  setContextIdentity,
  clearContextIdentity,
  clearAllStorage,
} from '@calimero-network/mero-react';
```

The access/refresh tokens themselves live in the mero-js token store (`LocalStorageTokenStore`, the
`mero-tokens` localStorage blob) — managed by the provider, not these helpers.

---

## Custom token store (advanced)

To persist tokens somewhere other than localStorage, pass a `tokenStore` to `MeroProvider`:

```typescript
import { MeroProvider, MemoryTokenStore } from '@calimero-network/mero-react';

<MeroProvider mode={AppMode.MultiContext} tokenStore={new MemoryTokenStore()}>
  {/* … */}
</MeroProvider>
```

`mero-js` also exports `MemoryTokenStore` and `LocalStorageTokenStore` and the `TokenStore`
interface for non-React use.
