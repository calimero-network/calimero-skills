# Rule: Do not write Calimero app logic with the 0.x JS SDK

## What's wrong

Starting or extending an app on `@calimero-network/calimero-sdk-js`:

<!-- validate-ignore: no-js-app-sdk-import (intentional WRONG example: the 0.x JS SDK) -->

```typescript
import { State, Logic, Init, View } from '@calimero-network/calimero-sdk-js'; // 0.x only

@State
export class KvState {}
```

<!-- validate-ignore: no-js-app-sdk (intentional WRONG example: the 0.x JS SDK) -->

```bash
pnpm add @calimero-network/calimero-sdk-js       # 0.x only
npx calimero-sdk build src/index.ts -o app.wasm  # a core module: core 1.0 refuses it
```

The build produces a WebAssembly core module for the 0.x runtime. A core 1.0 node answers
`400 UNSUPPORTED_BUNDLE` to it at upload, install and instance creation, so the app never runs.

## What's correct

Write the app in Rust with `calimero-sdk` and build a `calimero:app` component:

```bash
meroctl app new my-app && cd my-app       # apps/kv-store: Rust logic/, React app/
meroctl app build apps/kv-store/logic --out app.wasm
meroctl local dev apps/kv-store           # or the whole loop on a local cluster
```

Keep TypeScript for the frontend, on `@calimero-network/mero-js`, with a typed client from
`meroctl app codegen --lang ts`. See `calimero-rust-sdk`, `calimero-client-js` and
`calimero-abi-codegen`.

## Why

Core 1.0 ships no JavaScript app SDK. Its engine would run a componentize-js component that
implements the `calimero:app` world and embeds an ABI section, but nothing in core or meroctl builds
one, so it is not a supported path.
