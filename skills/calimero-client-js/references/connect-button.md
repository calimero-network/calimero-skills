# CalimeroConnectButton

`CalimeroConnectButton` is the standard React component for authenticating against a Calimero node. It supports two modes: **Local** and **Remote**.

## Modes

| Mode | How it works | When to use |
| --- | --- | --- |
| **Local** | Hardcodes `node1.127.0.0.1.nip.io` as the node URL and opens the auth flow against that host | Local development with merobox (multi-node via Docker) |
| **Remote** | Prompts the user for a node URL or uses the configured endpoint | Production or when connecting to a custom node |

> **Gotcha:** "Local" mode uses `node1.127.0.0.1.nip.io`, **not** `localhost:2428`.
> If your `merod` node is running directly on `localhost:2428` (without merobox/Docker),
> "Local" mode will fail to connect. Use "Remote" mode and enter `http://localhost:2428` manually,
> or run your node with merobox which exposes the `*.127.0.0.1.nip.io` hostnames.

## Usage

```tsx
import { CalimeroConnectButton } from '@calimero-network/calimero-client';

function LoginPage() {
  return (
    <CalimeroConnectButton
      applicationId="<your-app-id>"
      onSuccess={() => {
        // Tokens are stored automatically via the storage helpers.
        // Navigate to your main app view.
        window.location.href = '/';
      }}
      onError={(error) => {
        console.error('Auth failed:', error);
      }}
    />
  );
}
```

## Configuring the node URL

If you want to preset the node URL instead of relying on Local/Remote mode selection:

```tsx
import { setAppEndpointKey } from '@calimero-network/calimero-client';

// Set before rendering the button
setAppEndpointKey('http://localhost:2428');
```

## Integrating with SSO

If the app is opened from Calimero Desktop, SSO tokens arrive in the URL hash and the
connect button is not needed. Check for SSO first:

```tsx
function App() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Try SSO first (see references/sso.md)
    if (initFromDesktopSSO()) {
      setAuthenticated(true);
      return;
    }
    // Check existing session
    const config = getAuthConfig();
    if (config.error === null) {
      setAuthenticated(true);
    }
  }, []);

  if (authenticated) return <MainApp />;
  return <CalimeroConnectButton applicationId="..." onSuccess={() => setAuthenticated(true)} />;
}
```

## Common issues

| Problem | Cause | Fix |
| --- | --- | --- |
| "Local" mode fails to connect | Node is on `localhost:2428`, not `*.127.0.0.1.nip.io` | Use "Remote" mode, or run via merobox |
| Button renders but nothing happens on click | Missing `applicationId` prop | Pass a valid app ID (from `meroctl app install`) |
| 401 after successful connect | Token expired and no refresh configured | Ensure `setRefreshToken` is called during auth |
