# Rule: Always handle 401 with token refresh

Access tokens expire. Any RPC call or WebSocket connection can return `401 Unauthorized`. Never let this surface as an unhandled error.

## Pattern

```typescript
async function callWithRefresh<T>(callFn: () => Promise<T>): Promise<T> {
  try {
    return await callFn();
  } catch (err: any) {
    if (err?.code === 401 || err?.status === 401) {
      await refreshAccessToken();
      return callFn(); // retry once
    }
    throw err;
  }
}

async function refreshAccessToken() {
  const jwt = getJWTObject();
  if (!jwt?.refresh_token) {
    // No refresh token — redirect to login
    window.location.href = '/login';
    return;
  }

  const newTokens = await client.refreshToken(jwt.refresh_token);
  localStorage.setItem('calimero_jwt', JSON.stringify(newTokens));
}
```

## Why

Access tokens are short-lived by design. Without refresh handling, users will see
random authentication errors mid-session. The refresh token is longer-lived and
should be used to silently re-authenticate.

## What to do if refresh also fails

Redirect to login. Do not retry the refresh indefinitely.
