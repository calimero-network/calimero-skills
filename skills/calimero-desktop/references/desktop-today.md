# Calimero Desktop Today

Checked in calimero-network/tauri-app at `origin/master` (025b373, 2026-10-28: "bundle merod 0.12.0
and cut a new desktop version") and against mero-js's "Migrating from v1" page. Re-check both before
relying on this: if the desktop moves to core 1.0, this skill must be rewritten.

## What the desktop is

| Item             | Value                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| App              | Tauri, `apps/desktop` (desktop version 0.0.149)                          |
| Node it bundles  | `merod` 0.12.0 (`merod-config.json`), the 0.x peer-to-peer node          |
| Client libraries | `@calimero-network/mero-js` ^26.11, `@calimero-network/mero-react` ^10.3 |
| Auth it uses     | the 0.x node's embedded auth: JWT access and refresh tokens              |

## The hash it opens an app with

The desktop (and its `calimero-shell` helper) opens an app's frontend URL with a hash built from the
0.x node's session, form-encoded:

```text
https://app.example.com/?_cb=<ms>#node_url=http%3A%2F%2Flocalhost%3A2528&access_token=<jwt>&refresh_token=calimero-desktop-brokered-refresh-token&expires_at=<ms>&app-id=<id>
```

- `access_token` is a JWT minted by the bundled 0.x node; the refresh token is a sentinel, because
  0.x refresh tokens are single-use and the desktop stays the only one that rotates them.
- The desktop's own "Open" (`apps/desktop/src/utils/appUtils.ts`) may add `application_id`,
  `context_id`, `executor_public_key` and `dev_mode=1`.
- Without a token, the app is opened with only `node_url` and the app's id, and logs in by itself.
- On the page, mero-react 10's `MeroProvider` reads the hash with mero-js 26's `parseAuthCallback`,
  stores the tokens and strips the hash.

## Its 1.0 equivalents

| Desktop / 0.x                        | core 1.0                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| `merod` 0.12 on the user's machine   | a cluster of attested nodes (Calimero Cloud), or `meroctl local up` for development     |
| JWT `access_token` / `refresh_token` | a passkey session (15 minutes) and refresh token (`rt_…`), or an API key                |
| tokens handed over in the URL hash   | `client.signIn(browserPasskey())` on the page itself                                    |
| `parseAuthCallback`, `MeroProvider`  | `CalimeroClient` and your own `CalimeroSession` store (`useSession`)                    |
| `node_url` from the hash             | `CalimeroClient.connect({ cluster, policy })`, or the frontend's own cluster origin     |
| `application_id` / context id        | the app instance's id (`app`)                                                           |
| app frontend at any URL              | the frontend served from the package at `{label}.{apps-domain}`, or a registered origin |

```ts
import { CalimeroClient, browserPasskey } from '@calimero-network/mero-js';

const client = await CalimeroClient.connect({
  cluster: 'eu-shared-1',
  policy: { release: { minReleaseVersion: '2.3.109' } },
});
await client.signIn(browserPasskey()); // or client.signUp(browserPasskey(), 'ada')
```

See `calimero-client-js` (`references/auth.md`) for sessions, refresh and step-ups.
