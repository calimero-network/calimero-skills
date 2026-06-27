# calimero-desktop — Agent Instructions

You are helping a developer integrate their app frontend with **Calimero Desktop SSO** — the flow
where users open an app from the Desktop and are automatically logged in without a manual auth
screen.

> **NOT this skill** if the developer just needs to authenticate manually via the login form — that
> is handled entirely by `mero-react` (`MeroProvider` + `ConnectButton`/`connectToNode`). This skill
> is specifically about the Desktop cold-open case and the token-less pre-seed.

## The one thing to get right

**`MeroProvider` (from `@calimero-network/mero-react`) already owns the SSO token hash.** On its
first render it runs `parseAuthCallback(window.location.href)`, stores the tokens where mero-js
reads them, sets node/app/context, and strips the hash from the address bar. The **same** hash
format is used by the normal web login redirect.

So the integration is mostly _not writing code_: render `MeroProvider`, gate your routes with
`useMero`, and let the provider consume the hash. **Do NOT read, parse, or strip a token-bearing
hash yourself** — racing ahead of the provider leaves the token in the wrong place, so every API
call goes out unauthenticated (401) and the user is bounced back to the landing page.

> ⚠️ Anti-pattern (do not do this): manually reading `window.location.hash`, calling
> `setAccessToken` / `setRefreshToken` / `setContextAndIdentityFromJWT` / `setAppEndpointKey`, or
> `history.replaceState` to strip a token hash. Those `@calimero-network/calimero-client` helpers
> are gone; mero-react owns this flow. See `rules/sso-fallback.md`.

## What Desktop does

Calimero Desktop opens app frontends in a browser window and passes the auth session via the URL
hash — so users are automatically logged in without going through the manual connect flow. The hash
is an OAuth-style auth callback; `MeroProvider` consumes it.

## Hash parameters passed by Desktop

These are the params `parseAuthCallback` reads (a hash WITHOUT `access_token` is not treated as an
auth callback):

| Parameter          | Description                                        |
| ------------------ | -------------------------------------------------- |
| `access_token`     | JWT for authenticated node calls (required)        |
| `refresh_token`    | Token to obtain a new access token                 |
| `node_url`         | URL of the local node (`http://localhost:PORT`)    |
| `application_id`   | The installed app's ID on this node                |
| `context_id`       | The context the session is bound to                |
| `context_identity` | The executor public key / identity for the context |

## Example URL

```text
https://your-app.com/#access_token=eyJ...&refresh_token=eyJ...&node_url=http://localhost:2428&application_id=abc123&context_id=...&context_identity=...
```

## Minimum integration

Wrap your app in `MeroProvider` and gate routes with `useMero`. The provider handles the hash; you
only read `isAuthenticated` / `isLoading`.

```tsx
import { AppMode, MeroProvider, useMero } from '@calimero-network/mero-react';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useMero();
  if (isLoading) return null; // wait for the auth probe — avoids a flash-bounce
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <MeroProvider mode={AppMode.MultiContext} packageName={APP_PACKAGE}>
      {/* ...router with <RequireAuth> around protected routes... */}
    </MeroProvider>
  );
}
```

When opened from Desktop, the hash carries the session, `MeroProvider.parseAuthCallback` consumes
it, `isAuthenticated` flips true after the probe, and the user lands straight in the app — no manual
login. When opened in a plain browser with no hash, `isAuthenticated` stays false and your guard
sends the user to the connect/login screen.

> Use `AppMode.MultiContext` (`AppMode.SingleContext` is deprecated since mero-react 2.1.0, removed
> in 3.0.0). The session authenticates the user against the node/app but no longer picks a context —
> your app lists contexts (`useContexts`) and, if none exist, creates the namespace → group →
> context chain via `mero.admin.createNamespace` / `createGroupInNamespace` /
> `createContext({ applicationId, groupId })`. See the `calimero-client-js` skill's
> `references/sso.md`.

## Critical rule

`isLoading` must settle before any redirect. The provider resolves auth asynchronously (it probes
the node with `getContexts()`), so a guard that redirects while `isLoading` is true will bounce a
freshly-authenticated user. Always `if (isLoading) return null;` first. See `rules/sso-fallback.md`.

## Related skills

- **`calimero-client-js`** — mero-js / mero-react API for auth, RPC, and WebSocket subscriptions
- **`calimero-core`** — auth flow (JWT tokens, login, refresh) and JSON-RPC protocol detail

## References

See `references/sso-integration.md` for the full provider/guard pattern and the token-less cold-open
pre-seed. See `rules/sso-fallback.md` for the fallback requirement and the anti-pattern to avoid.
