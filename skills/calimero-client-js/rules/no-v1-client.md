# Rule: use `CalimeroClient`, never the v1 client

Calimero 1.0 nodes speak only the sealed, attested API that mero-js's `CalimeroClient` implements.
The v1 SDK (merod 0.x) does not work against them.

## WRONG

<!-- validate-ignore: no-deprecated-client (intentional WRONG example) -->

```ts
import { MeroJs } from '@calimero-network/mero-js'; // v1 (26.x)
import { useCalimero } from '@calimero-network/calimero-client'; // deprecated

const mero = new MeroJs({ baseUrl: 'http://localhost:2428' });
await mero.rpc.execute({ contextId, method: 'add_note', argsJson: { text }, executorPublicKey });
```

## RIGHT

```ts
import { CalimeroClient, browserPasskey } from '@calimero-network/mero-js';

const client = new CalimeroClient({ baseUrl, nodes, policy: { allowMock: true } });
await client.signIn(browserPasskey());
await client.apps.call({ app: appId, method: 'addNote', args: { text } });
```

- No `contextId`, no `executorPublicKey`, no JSON-RPC, no admin login: an app instance is an `appId`
  in an organization, and the caller is the signed-in account.
- No `mero-react`: React apps keep the client in their own provider (or the app scaffold's) and use
  the generated typed client.
