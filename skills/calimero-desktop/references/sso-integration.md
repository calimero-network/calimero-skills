# SSO Integration Pattern

## Full startup flow

Use the storage helpers from `@calimero-network/calimero-client` — do **not** write to
`localStorage` directly. The helpers ensure correct key names and extract contextId +
executorPublicKey from the JWT automatically.

```typescript
import {
  setAppEndpointKey,
  setAccessToken,
  setRefreshToken,
  setApplicationId,
  setContextAndIdentityFromJWT,
  getAuthConfig,
} from '@calimero-network/calimero-client';

interface SSOParams {
  accessToken: string;
  refreshToken: string | null;
  nodeUrl: string;
  applicationId: string | null;
}

function readDesktopSSO(): SSOParams | null {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = hash.get('access_token');
  const nodeUrl = hash.get('node_url');

  if (!accessToken || !nodeUrl) return null;

  return {
    accessToken,
    refreshToken: hash.get('refresh_token'),
    nodeUrl,
    applicationId: hash.get('application_id'),
  };
}

async function bootstrap() {
  const sso = readDesktopSSO();

  if (sso) {
    // Store tokens via SDK helpers (sets localStorage keys correctly)
    setAppEndpointKey(sso.nodeUrl);
    setAccessToken(sso.accessToken);
    if (sso.refreshToken) setRefreshToken(sso.refreshToken);
    if (sso.applicationId) setApplicationId(sso.applicationId);
    // Extracts contextId + executorPublicKey from JWT claims
    setContextAndIdentityFromJWT(sso.accessToken);

    // Clear hash from URL bar (tokens shouldn't sit in browser history)
    history.replaceState(null, '', window.location.pathname + window.location.search);

    renderAuthenticatedApp();
    return;
  }

  // No SSO hash — check if already authenticated from a prior session
  const config = getAuthConfig();
  if (config.error === null) {
    renderAuthenticatedApp();
    return;
  }

  renderLoginScreen();
}

document.addEventListener('DOMContentLoaded', bootstrap);
```

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

## React app pattern

```typescript
// App.tsx
import { getAuthConfig, setAccessToken, setAppEndpointKey,
         setRefreshToken, setApplicationId, setContextAndIdentityFromJWT } from '@calimero-network/calimero-client';

function App() {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    const sso = readDesktopSSO();
    if (sso) {
      setAppEndpointKey(sso.nodeUrl);
      setAccessToken(sso.accessToken);
      if (sso.refreshToken) setRefreshToken(sso.refreshToken);
      if (sso.applicationId) setApplicationId(sso.applicationId);
      setContextAndIdentityFromJWT(sso.accessToken);
      history.replaceState(null, '', window.location.pathname);
      setAuthState('authenticated');
    } else {
      const config = getAuthConfig();
      setAuthState(config.error === null ? 'authenticated' : 'unauthenticated');
    }
  }, []);

  if (authState === 'loading') return <Spinner />;
  if (authState === 'unauthenticated') return <LoginScreen />;
  return <MainApp />;
}
```
