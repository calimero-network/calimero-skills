# Authentication

## Login flow

```typescript
import { setupWalletSelector } from '@near-wallet-selector/core';
import { ClientLogin } from '@calimero-network/calimero-client';

const client = new ClientLogin({ nodeUrl: 'http://localhost:2428' });

// 1. Generate a client key for this device
const { contextId, contextIdentity } = await client.generateClientKey({
  contextId: 'your-context-id',
  contextIdentity: 'your-identity',
});

// 2. Login — returns access_token + refresh_token
const tokens = await client.login({
  contextId,
  contextIdentity,
});

// 3. Store tokens
localStorage.setItem('access_token', tokens.access_token);
localStorage.setItem('refresh_token', tokens.refresh_token);
```

## Token storage

Tokens should be stored in `localStorage` or `sessionStorage`. The client library reads
them automatically if you use the provided storage helpers:

```typescript
import { getStorageAppEndpointKey, getJWTObject } from '@calimero-network/calimero-client';

const nodeUrl = getStorageAppEndpointKey();
const jwt = getJWTObject();
// jwt.access_token, jwt.refresh_token
```

## Checking auth status

```typescript
import { getJWTObject } from '@calimero-network/calimero-client';

function isLoggedIn(): boolean {
  const jwt = getJWTObject();
  return !!(jwt?.access_token);
}
```

## Logout

```typescript
localStorage.removeItem('calimero_jwt');
localStorage.removeItem('calimero_node_url');
// redirect to login
```
