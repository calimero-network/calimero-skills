# SSO Integration Pattern

## Full startup flow

There are **two** distinct cases in the URL when an app opens, and `mero-react` handles them
differently:

1. **Token-bearing hash** (`#access_token=...`) — this is an auth callback. It is produced both by
   Desktop SSO and by the normal web login redirect. **`MeroProvider` owns it.** On its first render
   the provider calls `parseAuthCallback(window.location.href)`, validates the `node_url`, stores
   the tokens via its token store, sets `application_id` / `context_id` / `context_identity` /
   `node_url`, and strips the hash. **You must not touch this hash** — reading/stripping it yourself
   races ahead of the provider and leaves the token where mero-js does not read it, so every call
   401s.

2. **Token-less hash** (`node_url` / `application_id` only, no `access_token`) — a cold Desktop open
   before a session exists. `parseAuthCallback` ignores this (it returns `null` without
   `access_token`), so it is safe — and useful — to pre-seed those values so the connect screen is
   pre-filled. Use the real `mero-react` storage setters for that.

### Wrap the app in MeroProvider

`MeroProvider` consumes the token hash; you never read it. Gate routes with `useMero`.

```tsx
// App.tsx
import { AppMode, MeroProvider, useMero } from '@calimero-network/mero-react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useMero();
  if (isLoading) return null; // wait for the async auth probe
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useMero();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <MeroProvider mode={AppMode.MultiContext} packageName={APP_PACKAGE}>
      <BrowserRouter>
        <Routes>
          {/* Front door — authenticated users (incl. desktop SSO) skip straight in. */}
          <Route
            path="/"
            element={
              <RedirectIfAuthed>
                <LandingPage />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/app"
            element={
              <RequireAuth>
                <MainApp />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MeroProvider>
  );
}
```

The Desktop "skip manual login" effect is automatic: the token hash is present → `MeroProvider`
authenticates → `isAuthenticated` becomes true → `RedirectIfAuthed` sends the user into the app.

### Token-less cold-open pre-seed (runs once, before React mounts)

Only for a hash that has NO `access_token`. Bail untouched on a token-bearing hash so `MeroProvider`
can own it. Use `setNodeUrl` / `setApplicationId` from `@calimero-network/mero-react` (these are the
real setters; they write the `mero:node_url` / `mero:application_id` keys the provider reads on
init).

```ts
// auth/ssoBootstrap.ts — call once from main.tsx BEFORE ReactDOM.render
import { setNodeUrl, setApplicationId } from '@calimero-network/mero-react';

export function bootstrapSso(): void {
  if (typeof window === 'undefined') return;
  // Best-effort, never throws into render: a sandboxed iframe or private-mode
  // browser can make the storage setters throw (localStorage unavailable). A
  // failed pre-seed must not crash the app before React mounts.
  try {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;

    const p = new URLSearchParams(hash);

    // Token-bearing hash → it's an auth callback. Leave it ENTIRELY to MeroProvider.
    if (p.get('access_token')) return;

    // Token-less cold open: pre-seed node URL / app id so the connect screen is pre-filled.
    const nodeUrl = p.get('node_url')?.trim();
    const applicationId = p.get('application_id')?.trim();
    if (nodeUrl) setNodeUrl(nodeUrl);
    if (applicationId) setApplicationId(applicationId);
  } catch (err) {
    console.warn('bootstrapSso: pre-seed skipped', err);
  }
}
```

```tsx
// main.tsx
import { bootstrapSso } from './auth/ssoBootstrap';

bootstrapSso(); // MUST run before React mounts
ReactDOM.createRoot(rootEl).render(<App />);
```

> The real `mero-react` storage setters are `setNodeUrl`, `setApplicationId`, `setContextId`,
> `setContextIdentity` (plus matching `get*` / `clear*` and `clearAllStorage`). There is **no**
> `setAppEndpointKey`, `setAccessToken`, `setRefreshToken`, or `setContextAndIdentityFromJWT` —
> token storage is internal to the provider's token store. Do not reach for those names.

## How Desktop discovers your app's frontend URL

Desktop reads the `links.frontend` field from your app's `manifest.json` inside the installed
bundle. Set this field so Desktop can open your app:

```json
{
  "name": "My App",
  "links": {
    "frontend": "https://my-app-frontend.com"
  }
}
```

Desktop opens this URL and appends the SSO hash params.

## Why not read the hash yourself

`MeroProvider` runs `parseAuthCallback` once on first render and is the single owner of the token
hash. If your code reads/strips the hash first:

- the token never reaches the provider's token store, so mero-js sends unauthenticated requests
  (401);
- the hash is gone before `parseAuthCallback` runs, so the provider can't recover the session;
- the user appears "logged in" for a frame, then gets bounced to the landing page.

Render the provider, gate with `useMero`, pre-seed only the token-less case. That's the whole
pattern.
