# SSO — Calimero Desktop Integration

When a user opens your app from Calimero Desktop, auth tokens arrive in the URL hash — the **same**
auth-callback format as web login. `MeroProvider` (mero-react) consumes that hash automatically, so
users skip the manual login flow.

## Hash parameters

| Parameter          | Description                                                           |
| ------------------ | --------------------------------------------------------------------- |
| `access_token`     | JWT for authenticated node calls                                      |
| `refresh_token`    | Token to obtain a new access token                                    |
| `node_url`         | URL of the local node to connect to                                   |
| `application_id`   | The installed application's ID on the node                            |
| `context_id`       | Context the token is scoped to (may be **absent** under MultiContext) |
| `context_identity` | Executor public key (may be **absent** under MultiContext)            |

> `parseAuthCallback` still parses `context_id` / `context_identity` when present, but the auth flow
> no longer selects a context for you (`AppMode.SingleContext` is deprecated). Under
> `AppMode.MultiContext` they often arrive empty — your app picks or creates the context (see
> "Selecting or creating a context" below).

## The rule: let `MeroProvider` own a token-bearing hash

A hash that contains `access_token` is an auth callback owned by mero-react. `MeroProvider` runs
`parseAuthCallback(location.href)` on first render, stores the tokens where mero-js reads them (the
`mero-tokens` blob), sets the node/app/context, and strips the hash. **Do not read or strip a
token-bearing hash yourself** — doing so races ahead of React and leaves the token in the wrong
place, so every API call goes out unauthenticated (401).

So a Desktop SSO app needs **no** custom token handling — just mount `MeroProvider`:

```tsx
import { AppMode, MeroProvider } from '@calimero-network/mero-react';

<MeroProvider mode={AppMode.MultiContext} packageName={PKG} registryUrl={REGISTRY}>
  <App />
</MeroProvider>;
```

## Optional: pre-seed a token-less cold open

A cold Desktop open can arrive with `node_url` / `application_id` but **no** token (mero-react
ignores a token-less callback). To pre-fill the connect screen, seed those before React mounts — but
bail on any hash that carries a token:

```typescript
import { setNodeUrl, setApplicationId } from '@calimero-network/mero-react';

// Run once, before ReactDOM.render — best-effort, never throws into render.
function preSeedColdOpen(): void {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return;
  const p = new URLSearchParams(hash);

  // Token-bearing hash → it's an auth callback. Leave it entirely to mero-react.
  if (p.get('access_token')) return;

  const nodeUrl = p.get('node_url')?.trim();
  const applicationId = (p.get('application_id') ?? '').trim();
  if (nodeUrl) setNodeUrl(nodeUrl);
  if (applicationId) setApplicationId(applicationId);
}
```

## Selecting or creating a context

`AppMode.SingleContext` is deprecated (since mero-react 2.1.0, removed in 3.0.0). Under
`AppMode.MultiContext` the auth callback authenticates the user against a node/app but does **not**
pick a context — your app does. List the user's contexts and, when there are none, create the
namespace → group → context chain yourself:

```typescript
import { useMero } from '@calimero-network/mero-react';

const { mero, applicationId } = useMero();

// 1. Namespace (root group) bound to the app
const { namespaceId } = await mero.admin.createNamespace({
  applicationId,
  upgradePolicy: 'Automatic', // or 'LazyOnAccess'
});

// 2. (Optional) a subgroup for narrower access — otherwise use namespaceId as the group
const { groupId } = await mero.admin.createGroupInNamespace(namespaceId, { name: 'team' });

// 3. Context bound to that group — groupId is REQUIRED
const { contextId, memberPublicKey } = await mero.admin.createContext({
  applicationId,
  groupId, // or namespaceId to bind to the root group directly
});
```

> Call `mero.admin.*` directly (rather than the `useCreateNamespace` / `useCreateContext` hooks)
> when you need the underlying server error to surface to the user — `useAsyncMutation` swallows it.
> For listing, use `useContexts` and `useNamespacesForApplication`.

## Important

- Never strip or store a token-bearing hash manually — `MeroProvider` does it.
- The app must also work when opened directly in a browser (web login via `connectToNode` /
  `ConnectButton`), not only from Desktop.
- Detect the Desktop shell with `'__TAURI_INTERNALS__' in window` if you need to branch behaviour
  (e.g. skip a manual connect screen).

---

> **DEPRECATED:** the old `@calimero-network/calimero-client` SSO pattern (`setAppEndpointKey` /
> `setAccessToken` / `setContextAndIdentityFromJWT` from a hand-parsed hash) is **forbidden** in
> generated apps. `MeroProvider` owns the auth callback now.
