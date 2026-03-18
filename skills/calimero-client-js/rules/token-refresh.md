# Rule: rpcClient handles token refresh automatically — but not all 401s

`rpcClient` (from `@calimero-network/calimero-client`) automatically retries with a
refreshed token when the server returns `401 token_expired`. **You do not need to
implement a refresh wrapper around `rpcClient.execute()` calls.**

What you DO need to handle: 401s that cannot be refreshed.

## WRONG — manual refresh wrapper (not needed for rpcClient):

```typescript
// ✗ Don't do this — rpcClient already retries on token_expired
async function callWithRefresh<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (err: any) {
    if (err?.code === 401) {
      await refreshAccessToken(); // rpcClient already does this
      return fn();
    }
    throw err;
  }
}
```

## CORRECT — handle only non-refreshable auth failures:

```typescript
const response = await rpcClient.execute({ ... });

if (response.error) {
  const authError = response.error.headers?.['x-auth-error'];

  if (response.error.code === 401) {
    if (authError === 'token_revoked' || authError === 'invalid_token') {
      // Token is invalid — cannot be refreshed. Send user to login.
      clientLogout();
      return;
    }
    // token_expired: rpcClient already retried and the retry failed.
    // This means the refresh token is also expired — send to login.
    clientLogout();
    return;
  }

  throw new Error(response.error.error.cause.info?.message ?? 'Unknown error');
}
```

## WebSocket connections are different — no auto-refresh

`WsSubscriptionsClient` does **not** auto-refresh tokens. If the token expires while
a WebSocket connection is open, events will stop arriving silently. Reconnect manually:

```typescript
async function connectWithAuth() {
  const ws = new WsSubscriptionsClient(getAppEndpointKey()!, '/ws');
  try {
    await ws.connect();
    ws.subscribe([getContextId()!]);
    ws.addCallback(handleEvent);
  } catch (err: any) {
    if (err?.status === 401) {
      // Token expired before WS connect — logout and re-authenticate
      clientLogout();
    }
    throw err;
  }
}
```

## Summary

| Scenario | Handled by |
| --- | --- |
| `401 token_expired` on RPC call | `rpcClient` automatically (transparent retry) |
| `401 token_revoked` on RPC call | You — redirect to login |
| `401 invalid_token` on RPC call | You — redirect to login |
| Auth failure on WebSocket connect | You — catch and redirect to login |
