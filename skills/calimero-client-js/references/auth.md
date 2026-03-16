# Authentication

## Storage helpers

`@calimero-network/calimero-client` provides these storage functions (backed by `localStorage`):

```typescript
import {
  // Node URL
  setAppEndpointKey,
  getAppEndpointKey,
  // JWT tokens
  setAccessToken,
  getAccessToken,
  setRefreshToken,
  getRefreshToken,
  // Context and identity (extracted from JWT)
  setContextId,
  getContextId,
  setExecutorPublicKey,
  getExecutorPublicKey,
  setContextAndIdentityFromJWT,  // extracts + stores contextId + executorPublicKey from JWT
  // App ID
  setApplicationId,
  getApplicationId,
  // Auth endpoint (separate from node URL)
  setAuthEndpointURL,
  getAuthEndpointURL,
  // Decoded JWT payload
  getJWTObject,     // returns { context_id, context_identity, exp, permissions, ... }
  // Full auth config (throws if required fields are missing)
  getAuthConfig,    // returns { appEndpointKey, contextId, executorPublicKey, jwtToken }
  // Logout (clears all tokens + reloads)
  clientLogout,
} from '@calimero-network/calimero-client';
```

---

## SSO login (from Calimero Desktop — recommended path)

When the app is opened by Desktop, tokens arrive in the URL hash. Store them:

```typescript
function initFromDesktopSSO(): boolean {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const accessToken  = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  const nodeUrl      = hash.get('node_url');
  const appId        = hash.get('application_id');

  if (!accessToken || !nodeUrl) return false;

  // Store everything
  setAppEndpointKey(nodeUrl);
  setAccessToken(accessToken);
  if (refreshToken) setRefreshToken(refreshToken);
  if (appId) setApplicationId(appId);

  // Extract contextId and executorPublicKey from JWT claims
  setContextAndIdentityFromJWT(accessToken);

  // Remove tokens from URL bar (don't let them sit in browser history)
  history.replaceState(null, '', window.location.pathname + window.location.search);

  return true;
}
```

---

## Manual login (no Desktop)

```typescript
import { setAppEndpointKey, setAccessToken, setRefreshToken, setContextAndIdentityFromJWT } from '@calimero-network/calimero-client';

async function login(nodeUrl: string, accessToken: string, refreshToken: string) {
  setAppEndpointKey(nodeUrl);
  setAccessToken(accessToken);
  setRefreshToken(refreshToken);
  setContextAndIdentityFromJWT(accessToken);
}
```

---

## Checking if authenticated

```typescript
import { getAuthConfig } from '@calimero-network/calimero-client';

function isAuthenticated(): boolean {
  const config = getAuthConfig();
  return config.error === null;
}
```

---

## Reading the JWT payload

```typescript
import { getJWTObject } from '@calimero-network/calimero-client';

const jwt = getJWTObject();
// jwt.context_id        — the context this token is scoped to
// jwt.context_identity  — the identity (executor public key)
// jwt.exp               — expiry timestamp (seconds)
// jwt.permissions       — array of permission strings
```

---

## Logout

```typescript
import { clientLogout } from '@calimero-network/calimero-client';

// Clears all tokens from localStorage and reloads the page
clientLogout();
```

---

## App startup pattern (SSO + fallback)

```typescript
import {
  setAppEndpointKey, setAccessToken, setRefreshToken,
  setApplicationId, setContextAndIdentityFromJWT,
  getAuthConfig,
} from '@calimero-network/calimero-client';

async function bootstrap() {
  // Try SSO from Desktop hash
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = hash.get('access_token');
  const nodeUrl     = hash.get('node_url');

  if (accessToken && nodeUrl) {
    setAppEndpointKey(nodeUrl);
    setAccessToken(accessToken);
    const rt = hash.get('refresh_token');
    if (rt) setRefreshToken(rt);
    const appId = hash.get('application_id');
    if (appId) setApplicationId(appId);
    setContextAndIdentityFromJWT(accessToken);
    history.replaceState(null, '', window.location.pathname);
    renderApp();
    return;
  }

  // Check if already authenticated from a previous session
  const config = getAuthConfig();
  if (config.error === null) {
    renderApp();
    return;
  }

  // Not authenticated — show manual login
  renderLogin();
}
```
