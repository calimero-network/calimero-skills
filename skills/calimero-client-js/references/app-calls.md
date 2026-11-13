# Calling an app

```ts
import { AppError, browserPasskey, passkeyConfirm } from '@calimero-network/mero-js';

// A call goes through the app's replicated log.
const { result: id, index } = await client.apps.call({
  app: appId,
  method: 'addNote', // camelCase: the Rust `add_note`
  args: { text: 'Hello' },
});

// A view reads without writing.
const { result: notes } = await client.apps.view({ app: appId, method: 'listNotes', args: {} });

// A view at least as new as the call above, from whichever replica answers.
await client.apps.view({
  app: appId,
  method: 'listNotes',
  args: {},
  consistency: 'stale',
  minIndex: index,
});

try {
  await client.apps.call({ app: appId, method: 'removeNote', args: { id: 'x' } });
} catch (e) {
  if (e instanceof AppError)
    console.log(e.appCode, e.fields); // the #[app::error] variant
  else throw e;
}
```

- `args` is an object keyed by the method's camelCase parameter names; every parameter is required
  except `Option<T>` ones, which may be `null` or left out. Unknown keys are refused.
- Wire values: `u64`/`i64` are decimal strings, `Vec<u8>` base64url, `Option` `null`.
- `422 APP_ERROR` is `AppError` (`appCode`, `fields`); `422 TRAP` (a panic in the app) is
  `TrapError`.
- An idempotency key makes a retried call apply once; the client reuses it across failover.

## Passkey step-ups

An `#[app::confirm]` method, an org invite, a role change or a member removal answers
`412 CONFIRM_REQUIRED`. Answer it with the per-call options:

```ts
const confirm = { confirm: passkeyConfirm(browserPasskey()) };
await client.apps.call({ app: appId, method: 'deleteBoard', args: { id } }, confirm);
```

## The generated typed client

`meroctl app codegen --abi app.wasm --lang ts -o src/generated` writes a class over these two
routes, with every method, argument, result, error and event typed from the app's ABI:

```ts
import { NotesClient } from './generated/client';

const notes = new NotesClient(client, appId, { after: () => saveSession(client.session) });
const id = await notes.addNote({ text: 'Hello' });
const all = await notes.listNotes();
```

See the `calimero-abi-codegen` skill for everything it exports.

## Instances and packages

```ts
await client.packages.install({ package: 'com.example.kv', version: '1.0.0' }); // from the registry
const { appId } = await client.apps.create({ name: 'kv', package: 'com.example.kv', org });
const { apps } = await client.apps.list({ package: 'com.example.kv' });
await client.apps.upgrade(
  { app: appId, version: '1.1.0' },
  { confirm: passkeyConfirm(browserPasskey()) }
);
```

- `apps.create` also takes `initArgs` (the arguments of the app's `#[app::init]`), `service` (one
  service of a multi-service package), `access` and `metadata`.
- A multi-service package names the service: `{ package, service: 'room', org }`.
