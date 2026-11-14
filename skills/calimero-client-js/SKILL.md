# calimero-client-js — Agent Instructions

You are helping a developer connect a **browser or Node.js** frontend to Calimero 1.0 with
`@calimero-network/mero-js`'s **`CalimeroClient`**. (Building the app itself is the
`calimero-rust-sdk` skill; its typed client is the `calimero-abi-codegen` skill.)

## What you need to know immediately

- One client: `CalimeroClient` from `@calimero-network/mero-js` (version 27 and later is the
  Calimero 1.0 client only). It attests every node (TDX) before sending anything, seals each request
  end to end, signs people in with **passkeys** (machines with API keys) and fails over across the
  cluster's nodes.
- **The v1 client is gone**: `MeroJs`, `mero.rpc.execute`, `mero.admin.*`, JSON-RPC, contexts,
  `contextId`, `executorPublicKey`, namespaces/groups, `@calimero-network/calimero-client` and
  `mero-react` are for merod 0.x nodes (mero-js 26.x) and do not work against 1.0.
- 1.0's names: an app instance (`appId`, v1 "context") lives in an **organization** (`orgId`, v1
  "namespace"); a person is an **account** (`accountId`); a signed `.mpk` is a **package**.
- The node's API is **one generated method per route**, grouped: `client.apps`, `client.orgs`,
  `client.auth`, `client.packages`, `client.consent`, `client.deployments`, `client.ops`,
  `client.public`. Each takes **one object** (path, query and body fields merged) and an optional
  per-call options object (`{ confirm }` for a passkey step-up).
- Call app methods with `client.apps.call({ app, method, args })` (through the app's log) and
  `client.apps.view({ app, method, args })` (no write). Method and argument names are camelCase;
  `u64`/`i64` are decimal strings, bytes base64url, `Option` is `null`.
- Prefer the app's **generated typed client** (`meroctl app codegen`) over hand-written `apps.call`
  strings.
- A development cluster (`merod local`, `merod run --dev`) sends mock attestation quotes, which pass
  only with `policy: { allowMock: true }`. Nothing is read from the environment.

## Quick start

```ts
import { CalimeroClient, browserPasskey, passkeyConfirm } from '@calimero-network/mero-js';

// A Calimero Cloud cluster, by name. Trust the signed mero-tee release from this one up.
const client = await CalimeroClient.connect({
  cluster: 'eu-shared-1',
  policy: { release: { minReleaseVersion: '2.3.109' } },
});

await client.signUp(browserPasskey(), 'alice'); // or client.signIn(browserPasskey())

const { orgId: org } = await client.orgs.create({ name: 'Team' });
const { appId: app } = await client.apps.create({ name: 'kv', package: 'com.example.kv', org });

await client.apps.call({ app, method: 'set', args: { key: 'a', value: '1' } });
const { result } = await client.apps.view({ app, method: 'get', args: { key: 'a' } });
await client.apps.call(
  { app, method: 'clear', args: {} },
  { confirm: passkeyConfirm(browserPasskey()) } // an #[app::confirm] method
);
for await (const event of client.events(app)) console.log(event.kind, event.data);
```

Local development against `merod local`:

```ts
const client = new CalimeroClient({
  baseUrl: 'http://127.0.0.1:2501',
  nodes: ['http://127.0.0.1:2502', 'http://127.0.0.1:2503'],
  policy: { allowMock: true },
});
```

## References

- `references/auth.md`: connecting, passkeys, sessions, API keys
- `references/app-calls.md`: calls, views, typed errors, passkey step-ups, the generated client
- `references/organizations.md`: organizations, invites, roles, teams, instances
- `references/events.md`: following an instance's events
- `references/blobs.md`: uploading and downloading files

## Rules

- `rules/no-v1-client.md`
- `rules/camelcase-api.md`
- `rules/session-refresh.md`

The mero-js documentation is the source of truth: <https://calimero-network.github.io/mero-js/>.
