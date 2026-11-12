# Connecting and signing in

## Connecting

```ts
import { CalimeroClient } from '@calimero-network/mero-js';

// Calimero Cloud: the cluster's nodes come from the public node directory.
const cloud = await CalimeroClient.connect({
  cluster: 'eu-shared-1',
  policy: { release: { minReleaseVersion: '2.3.109' } },
});

// A fixed list of nodes (a cluster you run, or merod local).
const local = new CalimeroClient({
  baseUrl: 'http://127.0.0.1:2501',
  nodes: ['http://127.0.0.1:2502', 'http://127.0.0.1:2503'],
  policy: { allowMock: true }, // development clusters send mock quotes
});
```

Before it sends anything to a node, the client checks the node's attestation under **your**
`policy`: the mero-tee release it names (at least `minReleaseVersion`, its signed measurements), the
TDX quote against Intel's collateral, and that the quote binds the sealed channel's key. The
directory only decides which nodes to try; a wrong list can only make connecting fail.

Any node of a cluster serves any request. While a node answers `503` or cannot be reached, the
client retries and then fails over to the next node with the same idempotency key. `client.nodeUrl`
is the node in use.

## Passkeys

```ts
import { browserPasskey } from '@calimero-network/mero-js';

await client.signUp(browserPasskey(), 'Ada'); // a new account
await client.signIn(browserPasskey()); // an existing one
await client.addPasskey(browserPasskey(), browserPasskey()); // a new device, approved by an existing one
await client.signOut();
```

- `signUp(passkey, name, { invite?, origin?, signal? })` can redeem an org invite as it signs up.
- A Calimero Cloud node runs passkey ceremonies only for frontends it serves itself (the app
  bundle's packed frontend, on the package's origin). A copy hosted elsewhere renders but cannot
  sign anyone in.
- In Node or tests, pass any `PasskeyProvider`; `browserPasskey()` uses WebAuthn in the browser.

## Sessions

`client.session` is the current session; `client.useSession(saved)` restores one (for example after
a page reload). The client refreshes an expired session on its own; see `rules/session-refresh.md`
for storing the refreshed one.

## Machines: API keys

```ts
const { key } = await client.auth.apikeyCreate({ label: 'ci', apps: [appId], readOnly: true });
const machine = new CalimeroClient({ baseUrl, policy });
machine.useApiKey(key);
```

API keys cannot do what needs a passkey (invites, role changes, `#[app::confirm]` methods).

## Errors

Refusals are typed and extend `CalimeroError` (`status`, `code`): `LoginRequired`, `NotFound`,
`ConfirmRequired`, `ConfirmCancelled`, `AppError`, `TrapError`, `UnavailableError`,
`OriginNotRegistered`, `QuotaExceeded`, ...
