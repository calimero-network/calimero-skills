# What `client.ts` exports

`meroctl app codegen --lang ts` writes one `client.ts` (plus `openapi.json`). For an app named
`kv-store` it exports:

| Export                           | What it is                                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `class KvStoreClient`            | `new KvStoreClient(client, appId, { after? })`: one method per app method.                                  |
| `interface KvStoreApi`           | The methods alone, for code and tests that take `Pick<KvStoreApi, 'len'>` and are handed a double.          |
| `interface KvStoreRawApi`        | The same methods answering the whole answer (`raw`, below).                                                 |
| `<Method>Args`                   | Each method's argument object (`SetArgs`).                                                                  |
| `InitArgs`                       | `#[app::init]`'s arguments, when it takes any.                                                              |
| `<Variant>Error`, `AppErrorCode` | The `#[app::error]` variants and their fields.                                                              |
| `<Variant>Event`, `AppEvent`     | The `#[app::event]` variants, and the union `events()` yields.                                              |
| one type per ABI `types` entry   | A `Record`/`AbiType` struct is an `interface`, an enum a union of its serde forms. Anything else `unknown`. |

## Methods

Each method takes **one args object** (nothing when the method has no parameters) and an optional
options object last:

- a call: `{ idempotencyKey, confirm, signal }`; `confirm: passkeyConfirm(passkey)` answers an
  `#[app::confirm]` method's `412 CONFIRM_REQUIRED`;
- a view: `{ consistency: 'stale', minIndex, signal }`.

Values follow the ABI's JSON forms: `u64`/`i64` are decimal **strings**, bytes base64url, `Option`
is `null`; an `option<..>` argument may be left out.

```ts
await kv.set({ key: 'a', value: 'b' }, { idempotencyKey: crypto.randomUUID() });
const fresh = await kv.get({ key: 'a' }, { consistency: 'stale' });
```

## `raw`: the log index and events

`kv.raw.<method>(...)` takes the same arguments and answers a call's `{ result, index, events }`
(`CallAnswer<T>`) or a view's `{ result, index }` (`ViewAnswer<T>`). Use the index to read a later
view at least as new as a call, or to follow events from what a view already reflects:

```ts
const { index } = await kv.raw.set({ key: 'greeting', value: 'hello' });
const value = await kv.get({ key: 'greeting' }, { consistency: 'stale', minIndex: index });

const { result: entries, index: seen } = await kv.raw.entries();
for await (const event of kv.events(seen + 1)) {
  /* ... */
}
```

If the app has a method named `raw`, the property is `rawAnswers`.

## `events(from?, signal?)`

The instance's events as `{ id, kind, data }`, typed as `AppEvent` (narrow on `kind`). It needs a
transport with `events` (a `CalimeroClient` has it).

## Create an instance with `init` arguments

```ts
import type { InitArgs } from './generated/client';

const { appId } = await client.apps.create({
  package: 'com.calimero.mero-chess',
  initArgs: { title: 'Friday blitz', now: String(Date.now()) } satisfies InitArgs,
});
```

## Keep a refreshed session

mero-js refreshes an expired session on its own. A page that stores the session passes `after`,
which runs after every call and view, refused ones included:

```ts
const kv = new KvStoreClient(client, appId, { after: () => saveSession(client.session) });
```

## Test without a node

Code that takes a `KvStoreApi` (or a `Pick` of it) is handed the class in the app and a double in a
test. To test the class itself, give it a double of the part of `CalimeroClient` it uses: calls and
views need `apps.call` and `apps.view` (an `AppCallTransport`); `events()` also needs `events`.

```ts
const kv = new KvStoreClient(
  {
    apps: {
      call: async () => ({ result: null }),
      view: async ({ method }) => ({ result: method === 'len' ? '0' : null }),
    },
  },
  'app-1'
);
```

The class has no `appId` property: keep the id you built it with.
