# From the 0.x JS SDK to core 1.0

The app moves to Rust (`calimero-rust-sdk`); the frontend stays in TypeScript, on mero-js
(`calimero-client-js`).

| 0.x JS SDK                                        | core 1.0                                                                                                                |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `@State` class                                    | `#[app::state(version = N)]` on a struct                                                                                |
| `@Logic(State)` class extending the state         | `#[app::logic]` on the struct's `impl` block                                                                            |
| `@Init static init()`                             | `#[app::init] pub fn init() -> app::Result<Self> { Ok(Self::load()) }`                                                  |
| `@View()` method                                  | `#[app::view]` on a `&self` method; calls are `&mut self`                                                               |
| CRDT collections (`UnorderedMap`, `Counter`, ...) | plain collections: `Table`, `UnorderedMap`, `Set`, `Vector`, `Cell`, `Counter`, `PerUser` (`Text` is the one CRDT left) |
| `env.log(...)`                                    | `env::log(...)`                                                                                                         |
| `emit(...)` events                                | `#[app::event]` enum, `env::emit(Event::X { .. }, Audience::All)?`                                                      |
| `env.executorId()`, context members               | `env::caller()`, `guards::require_member()`, organizations and teams                                                    |
| throwing an error                                 | `#[app::error]` enum, `app::bail!(Error::X { .. })`                                                                     |
| `calimero-sdk build`, `pnpm build` (QuickJS)      | `meroctl app build <crate-dir> --out app.wasm`                                                                          |
| `pnpm deploy`, `meroctl app install` of a `.wasm` | `meroctl app pack` + `meroctl app publish` (`calimero-registry`)                                                        |
| JSON-RPC `execute` from a frontend                | `client.apps.call` / `client.apps.view` (mero-js), or the generated typed client                                        |
| a context                                         | an app instance (`meroctl instance create --name N --package P`)                                                        |

## The same KV store in Rust

```rust
use calimero_sdk::prelude::*;

#[app::state(version = 1)]
pub struct KvStore {
    items: UnorderedMap<String, String>,
}

#[app::event]
pub enum Event {
    Set { key: String },
}

#[app::logic]
impl KvStore {
    #[app::init]
    pub fn init() -> app::Result<Self> {
        Ok(Self::load())
    }

    pub fn set(&mut self, key: String, value: String) -> app::Result<()> {
        self.items.insert(&key, &value)?;
        env::emit(Event::Set { key }, Audience::All)?;
        Ok(())
    }

    #[app::view]
    pub fn get(&self, key: String) -> app::Result<Option<String>> {
        Ok(self.items.get(&key)?)
    }
}
```

Collections take references (`insert(&k, &v)`) and return `Result`, so use `?`. See
`calimero-rust-sdk` (`references/state-collections.md`, `references/events.md`) for the rest.

## Calling it from TypeScript

```ts
import { CalimeroClient, browserPasskey } from '@calimero-network/mero-js';

const client = new CalimeroClient({
  baseUrl: 'http://127.0.0.1:2501',
  policy: { allowMock: true },
});
await client.signIn(browserPasskey());
await client.apps.call({ app, method: 'set', args: { key: 'a', value: '1' } });
const { result } = await client.apps.view({ app, method: 'get', args: { key: 'a' } });
```

`meroctl app codegen --abi logic/res/abi.json --lang ts -o app/src/generated` writes a typed client
for it (`calimero-abi-codegen`).
