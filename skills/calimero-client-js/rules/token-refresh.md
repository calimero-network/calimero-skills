# Rule: mero-js refreshes tokens automatically — but not all 401s

The mero-js HTTP client (used by `mero.rpc`, `mero.admin`, `mero.auth`) automatically refreshes the
access token and retries the request when the server returns `401` with the
`x-auth-error: token_expired` header. **You do not need a refresh wrapper around
`mero.rpc.execute()` / `mero.admin.*` calls.**

What you DO need to handle: 401s that cannot be refreshed (`token_revoked`, `invalid_token`, or an
expired refresh token) — the call **throws** in that case, so handle it in `catch` and send the user
back to login (`useMero().logout()`).

> Errors are **thrown** (mero-js does not return a `{ error }` object). There is no `response.error`
> to inspect. Two error classes matter: an **application** error (a JSON-RPC error in a 2xx body)
> throws `RpcError` (`.code`); an **HTTP** failure — including an unrefreshable `401` — throws
> `HTTPError` (`.status`). Both are exported from `@calimero-network/mero-js`.

## WRONG — manual refresh wrapper (not needed):

```typescript
// ✗ Don't do this — mero-js already retries on token_expired
async function callWithRefresh<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (err: any) {
    if (err?.code === 401) {
      await refreshAccessToken(); // mero-js already does this
      return fn();
    }
    throw err;
  }
}
```

## CORRECT — let it retry, catch the unrefreshable failures:

```typescript
import { HTTPError, RpcError } from '@calimero-network/mero-js'; // error classes live in mero-js
import { useMero } from '@calimero-network/mero-react'; // React hook lives in mero-react

const { mero, logout } = useMero();

try {
  const value = await mero.rpc.execute<string | null>({
    contextId,
    method: 'get',
    argsJson: { key },
  });
  // use value
} catch (err) {
  // token_expired was already retried transparently. Reaching here with a 401
  // means the token could not be refreshed (revoked / invalid / refresh token
  // expired). An unrefreshable 401 surfaces as an `HTTPError` (status 401), not
  // an `RpcError` — `RpcError` carries application/JSON-RPC errors, not the HTTP
  // status. Send the user back to login.
  if (err instanceof HTTPError && err.status === 401) {
    logout();
    return;
  }
  if (err instanceof RpcError) {
    // application-level failure — handle/surface it, don't log the user out
    throw err;
  }
  throw err;
}
```

> `MeroProvider` also wires the SSE connection to call `logout()` automatically when the event
> stream fails with a 401, so a revoked session usually logs the user out without per-call handling.

## Events are different — SSE/WS tokens are not auto-refreshed

`mero.events` (SSE) and `mero.ws` (experimental) authenticate the long-lived connection once with
the current token; an expired token will surface as a connection `error`. In mero-react,
`useSubscription` / `MeroProvider` reconnect and (on a 401) log the user out for you. In standalone
mero-js, listen for the `error` event and re-`connect()` after re-authenticating.

## Summary

| Scenario                              | Handled by                                            |
| ------------------------------------- | ----------------------------------------------------- |
| `401 token_expired` on RPC/admin call | mero-js automatically (transparent retry)             |
| `401 token_revoked` / `invalid_token` | You — catch the throw, `logout()` to re-login         |
| Refresh token also expired            | You — catch the throw, `logout()` to re-login         |
| Auth failure on the event stream      | `MeroProvider` / `useSubscription` (logout/reconnect) |
