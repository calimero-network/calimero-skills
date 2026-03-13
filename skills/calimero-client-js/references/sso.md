# SSO — Calimero Desktop Integration

When a user opens your app from Calimero Desktop, auth tokens are passed via the URL hash.
Reading them lets users skip the manual login flow entirely.

## Hash parameters

| Parameter | Description |
| --- | --- |
| `access_token` | JWT for authenticated node calls |
| `refresh_token` | Token to obtain a new access token |
| `node_url` | URL of the local node to connect to |
| `application_id` | The installed application's ID on the node |

## Reading from hash

```typescript
function readSSOParams(): {
  accessToken: string | null;
  refreshToken: string | null;
  nodeUrl: string | null;
  applicationId: string | null;
} {
  const hash = window.location.hash.slice(1); // remove leading #
  const params = new URLSearchParams(hash);
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    nodeUrl: params.get('node_url'),
    applicationId: params.get('application_id'),
  };
}
```

## Using SSO tokens on app startup

```typescript
async function initApp() {
  const sso = readSSOParams();

  if (sso.accessToken && sso.nodeUrl) {
    // Opened from Desktop — store tokens and skip login
    localStorage.setItem('calimero_node_url', sso.nodeUrl);
    localStorage.setItem('calimero_jwt', JSON.stringify({
      access_token: sso.accessToken,
      refresh_token: sso.refreshToken,
    }));
    // clear hash so tokens aren't in browser history
    history.replaceState(null, '', window.location.pathname);
    renderApp();
  } else {
    // No SSO — show manual login
    renderLogin();
  }
}
```

## calimero-client reads hash automatically

If you use `@calimero-network/calimero-client`'s built-in auth helpers, the library
reads `window.location.hash` automatically and stores the tokens. You don't need the
manual parsing above unless you're building a custom auth flow.

## Important

Always fall back to manual login if the hash params are absent — the app must work
when opened directly in a browser, not only from Desktop.
