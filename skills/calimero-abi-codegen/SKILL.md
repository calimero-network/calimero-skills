# calimero-abi-codegen — Agent Instructions

You are helping a developer generate a **typed client for a Calimero app** from the app's ABI.

## What you need to know immediately

- Core 1.0 generates clients with **`mero-app-build codegen`**, a subcommand of core's app builder.
  The npm package `@calimero-network/abi-codegen` (`calimero-abi-codegen`, `wasm-abi/1` manifests,
  `--manifest`/`--client-name` flags, `{ mero, contextId, executorPublicKey }` clients) read SDK
  0.12 ABIs only and is not used with core 1.0.
- The ABI is **embedded in the component** (its `calimero:abi` custom section) by `#[app::logic]`.
  `codegen` reads it from the built `.wasm`, the signed `.mpk` or an ABI JSON file
  (`meroctl context abi` saves an installed app's).
- `--lang` is `ts`, `python`, `swift`, `kotlin` or `openapi`. Each language also writes
  `openapi.json` beside the client unless `--no-openapi`.
- The TypeScript client is a thin typed layer over mero-js's **`CalimeroClient`**
  (`client.apps.call` / `client.apps.view`). The sealed channel, attestation, sessions, passkey
  step-ups and retries stay mero-js's job.
- The class is named after `--name`, else the `.mpk`'s package, else the file name (`kv-store.wasm`
  → `KvStoreClient`). For a file named `abi.json` or `app.component.wasm` it uses the crate whose
  `Cargo.toml` is nearest above it, and asks for `--name` when there is none.
- **Never edit the generated file.** Change the Rust, rebuild, regenerate.

## Generate

```bash
mero-app-build . --out kv-store.wasm                                     # build the component
mero-app-build codegen --abi kv-store.wasm --lang ts -o src/generated    # wrote openapi.json, client.ts
mero-app-build codegen --abi res/abi.json --lang ts --name kv-store --no-openapi -o src/api/kv-store
```

A multi-service bundle writes one directory per service; `--service <name>` picks one.

## Use it

```ts
import { CalimeroClient, browserPasskey, passkeyConfirm } from '@calimero-network/mero-js';
import { KvStoreClient } from './generated/client';

const client = await CalimeroClient.connect({
  cluster: 'eu-shared-1',
  policy: { release: { minReleaseVersion: '2.3.109' } },
});
await client.signIn(browserPasskey());

const kv = new KvStoreClient(client, appId, { after: () => saveSession(client.session) });

await kv.set({ key: 'greeting', value: 'hello' }); // one args object, camelCase
const value: string | null = await kv.get({ key: 'greeting' });
const count: string = await kv.len(); // u64: a decimal string
await kv.remove({ key: 'greeting' }, { confirm: passkeyConfirm(browserPasskey()) }); // an #[app::confirm] method

for await (const event of kv.events()) {
  if (event.kind === 'Inserted') console.log(event.data.key);
}
```

## References

- `references/generated-output.md`: everything `client.ts` exports, `raw`, `events`, `InitArgs`,
  testing with doubles.
- `references/abi-format.md`: the component ABI the generator reads.
- `references/install-and-ci.md`: installing `mero-app-build`, CI, and `abi-diff` for breaking
  changes.

## Rules

- `rules/regenerate-dont-edit.md`
- `rules/derive-every-exchanged-type.md`
