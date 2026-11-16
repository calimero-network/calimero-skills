# Rule: A core 1.0 frontend never reads a session from the URL

## What's wrong

Carrying the 0.x desktop SSO pattern into a core 1.0 app:

<!-- validate-ignore: no-hash-sso (intentional WRONG example: 0.x desktop SSO) -->

```ts
// WRONG on core 1.0: no node issues these tokens, and mero-js 27+ has no parseAuthCallback
const hash = new URLSearchParams(window.location.hash.slice(1));
const accessToken = hash.get('access_token');
const nodeUrl = hash.get('node_url');
```

A core 1.0 node issues no JWTs, so there is nothing to put in the hash; the code either finds
nothing or trusts whatever a link carries. A URL is also the wrong place for a credential: it ends
up in history, logs and `Referer` headers.

## What's correct

Sign the person in on the page with a passkey, through the attested, sealed client, and keep the
session yourself:

```ts
import { CalimeroClient, browserPasskey } from '@calimero-network/mero-js';

const client = new CalimeroClient({
  baseUrl: 'http://127.0.0.1:2501',
  policy: { allowMock: true },
});
await client.signIn(browserPasskey());
```

On Calimero Cloud, serve the frontend from the package (the cluster's `{label}.{apps-domain}`
origin, or one its manager registered), where the node runs passkey ceremonies. A service uses an
API key, set from its environment, never from a URL.

The one thing a URL legitimately carries into a 1.0 app is an organization invite token
(`?invite=inv_…`), which the person then redeems while signed in.

## Why

The desktop's hash SSO belongs to the 0.x node it bundles (merod 0.12) and mero-js 26. Core 1.0
replaced JWTs with passkey sessions bound to the cluster's relying party and, on a package's
frontend, to that package.
