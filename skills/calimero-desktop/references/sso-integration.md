# SSO Integration Pattern

## Full startup flow

```typescript
interface SSOParams {
  accessToken: string;
  refreshToken: string;
  nodeUrl: string;
  applicationId: string;
}

function readDesktopSSO(): SSOParams | null {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  const nodeUrl = hash.get('node_url');
  const applicationId = hash.get('application_id');

  if (!accessToken || !nodeUrl) return null;

  return {
    accessToken,
    refreshToken: refreshToken ?? '',
    nodeUrl,
    applicationId: applicationId ?? '',
  };
}

async function bootstrap() {
  const sso = readDesktopSSO();

  if (sso) {
    // Clear hash from URL bar (tokens shouldn't sit in browser history)
    history.replaceState(null, '', window.location.pathname + window.location.search);

    // Store for use by the client
    localStorage.setItem('calimero_node_url', sso.nodeUrl);
    localStorage.setItem('calimero_jwt', JSON.stringify({
      access_token: sso.accessToken,
      refresh_token: sso.refreshToken,
    }));
    localStorage.setItem('calimero_app_id', sso.applicationId);

    await renderAuthenticatedApp(sso);
  } else {
    renderLoginScreen();
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
```

## How Desktop discovers your app's frontend URL

Desktop reads the `links.frontend` field from your app's `manifest.json` inside the installed bundle. To ensure Desktop can open your app correctly, set this field:

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
function App() {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    const sso = readDesktopSSO();
    if (sso) {
      storeTokens(sso);
      setAuthState('authenticated');
    } else if (hasStoredTokens()) {
      setAuthState('authenticated');
    } else {
      setAuthState('unauthenticated');
    }
  }, []);

  if (authState === 'loading') return <Spinner />;
  if (authState === 'unauthenticated') return <LoginScreen />;
  return <MainApp />;
}
```
