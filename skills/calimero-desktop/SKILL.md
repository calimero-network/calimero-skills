# calimero-desktop — Agent Instructions

You are helping a developer integrate their app frontend with **Calimero Desktop SSO** —
the flow where users open an app from the Desktop and are automatically logged in without
a manual auth screen.

> **NOT this skill** if the developer just needs to authenticate manually via the login
> form — that is handled entirely by `calimero-client-js`. This skill is specifically for
> reading SSO tokens that Calimero Desktop passes in the URL hash.

## What Desktop does

Calimero Desktop opens app frontends in a browser window and passes auth tokens via the
URL hash — so users are automatically logged in without going through the manual auth flow.

## Hash parameters passed by Desktop

| Parameter | Type | Description |
| --- | --- | --- |
| `access_token` | string | JWT for authenticated node calls |
| `refresh_token` | string | Token to obtain a new access token |
| `node_url` | string | URL of the local node (`http://localhost:PORT`) |
| `application_id` | string | The installed app's ID on this node |

## Example URL

```
https://your-app.com/#access_token=eyJ...&refresh_token=eyJ...&node_url=http://localhost:2428&application_id=abc123
```

## Minimum integration

```typescript
const hash = new URLSearchParams(window.location.hash.slice(1));
const accessToken = hash.get('access_token');
const nodeUrl = hash.get('node_url');

if (accessToken && nodeUrl) {
  // Store and use — user is already authenticated
} else {
  // Show manual login
}
```

## Critical rule

Always fall back to manual login when hash params are absent. The app must work when
opened in a regular browser, not only from Desktop.

## Related skills

- **`calimero-client-js`** — mero-js / mero-react API for auth, RPC, and WebSocket subscriptions
- **`calimero-core`** — auth flow (JWT tokens, login, refresh) and JSON-RPC protocol detail

## References

See `references/` for full integration pattern and how Desktop discovers app URLs.
See `rules/` for the fallback requirement.
