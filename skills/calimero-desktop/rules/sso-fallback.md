# Rule: Let MeroProvider own the token hash; fall back to manual login when absent

Your app must work in two scenarios:

1. Opened from Calimero Desktop (or via a web login redirect) — a token-bearing hash is present.
2. Opened directly in a browser — no hash params.

`MeroProvider` (from `@calimero-network/mero-react`) handles both: it consumes a token-bearing hash
via `parseAuthCallback` on first render, and when there is no hash it simply resolves to
`isAuthenticated: false`. Your job is to **gate routes with `useMero` and wait for `isLoading`** —
not to parse the hash yourself.

## WRONG — racing the provider / using removed helpers:

```typescript
// ✗ Reads and strips the token hash before MeroProvider can — token ends up in the
//   wrong place, every call 401s, user is bounced to the landing page.
// ✗ setAccessToken / setRefreshToken / setContextAndIdentityFromJWT / setAppEndpointKey
//   are NOT part of mero-react; they were @calimero-network/calimero-client helpers and are gone.
const hash = new URLSearchParams(window.location.hash.slice(1));
const token = hash.get('access_token');
if (token) {
  setAccessToken(token);                         // ✗ no such mero-react export
  setContextAndIdentityFromJWT(token);           // ✗ no such mero-react export
  history.replaceState(null, '', location.pathname); // ✗ strips the hash MeroProvider needs
}
```

## WRONG — redirecting before the auth probe settles:

```typescript
// ✗ MeroProvider resolves auth asynchronously (it probes the node). Redirecting while
//   isLoading is true bounces a freshly-authenticated user — the "logged in but kicked
//   back to landing" bug.
const { isAuthenticated } = useMero();
if (!isAuthenticated) return <Navigate to="/" replace />;
```

## CORRECT — gate with useMero, wait for isLoading:

```typescript
import { useMero } from '@calimero-network/mero-react';
import { Navigate } from 'react-router-dom';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useMero();
  if (isLoading) return null;            // ✓ wait for the probe / callback to resolve
  if (!isAuthenticated) return <Navigate to="/" replace />; // ✓ fallback to login
  return <>{children}</>;
}
```

## CORRECT — pre-seed ONLY a token-less cold open:

```typescript
import { setNodeUrl, setApplicationId } from '@calimero-network/mero-react';

const p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
if (p.get('access_token')) {
  // ✓ Token-bearing hash → it's an auth callback. Do nothing; MeroProvider owns it.
} else {
  // ✓ Token-less cold open: pre-fill the connect screen via the real setters.
  const nodeUrl = p.get('node_url')?.trim();
  const applicationId = p.get('application_id')?.trim();
  if (nodeUrl) setNodeUrl(nodeUrl);
  if (applicationId) setApplicationId(applicationId);
}
```

## Why

Desktop is not the only way users access apps — developers test in browsers and the same hash format
is reused by the web login redirect. The app must be self-sufficient: render `MeroProvider`, let it
own the token hash, gate routes with `useMero`, and pre-seed only the token-less case. Anything that
reads or strips a token-bearing hash, or uses the removed `calimero-client` token helpers, breaks
auth.
