# calimero-sdk-js — Agent Instructions

You are helping a developer **build a Calimero P2P application in TypeScript** using
`@calimero-network/calimero-sdk-js`. The app compiles to WebAssembly and runs inside the `merod`
node runtime.

> **NOT this skill** if the developer is connecting a browser/Node.js _frontend_ to a node (that's
> `calimero-client-js` / `@calimero-network/calimero-client`). This skill is for writing the
> application logic that _runs on the node_.

## Install

```bash
pnpm add @calimero-network/calimero-sdk-js
pnpm add -D @calimero-network/calimero-cli-js typescript
```

The CLI's `postinstall` hook downloads QuickJS, WASI-SDK, and Binaryen automatically. If you used
`--ignore-scripts`, re-run with `pnpm install --ignore-scripts=false`.

## Core concepts

| Concept                    | What it is                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `@State` class             | Persisted data — fields must be CRDT types                                             |
| `@Logic(StateClass)` class | Entry points callable via JSON-RPC; must extend the state class                        |
| `@Init` static method      | Seeds the initial state when context is first created                                  |
| `@View()` method           | Read-only — skips persistence; required for query methods                              |
| CRDT collection            | Conflict-free type (`Counter`, `UnorderedMap`, etc.) — all state fields must use these |

## Minimal app

```typescript
import { State, Logic, Init, View } from '@calimero-network/calimero-sdk-js';
import { UnorderedMap } from '@calimero-network/calimero-sdk-js/collections';
import * as env from '@calimero-network/calimero-sdk-js/env';

@State
export class KvState {
  items: UnorderedMap<string, string> = new UnorderedMap();
}

@Logic(KvState)
export class KvLogic extends KvState {
  @Init
  static init(): KvState {
    return new KvState();
  }

  set(key: string, value: string): void {
    env.log(`set ${key}`);
    this.items.set(key, value);
  }

  @View()
  get(key: string): string | null {
    return this.items.get(key) ?? null;
  }
}
```

## CRDT collections quick reference

| Type                | Use case                                | Key ops                                            |
| ------------------- | --------------------------------------- | -------------------------------------------------- |
| `Counter`           | Distributed counting (returns `bigint`) | `increment()`, `incrementBy(n)`, `value()`         |
| `UnorderedMap<K,V>` | Key-value store (LWW per key)           | `set()`, `get()`, `has()`, `remove()`, `entries()` |
| `UnorderedSet<T>`   | Unique membership (LWW per element)     | `add()`, `has()`, `delete()`, `toArray()`          |
| `Vector<T>`         | Ordered list                            | `push()`, `get(i)`, `pop()`, `len()`               |
| `LwwRegister<T>`    | Single value (timestamp LWW)            | `set()`, `get()`                                   |

Nested collections (`Map<K, Set<V>>`) propagate changes automatically — no manual re-serialization.

## Build & deploy

```bash
# Build to WASM
npx calimero-sdk build src/index.ts -o build/service.wasm

# Install on node (app install is node-level — no context; --path is the WASM)
meroctl --node <NODE> app install \
  --path build/service.wasm
# → save the application-id, then create a namespace (root group) and a context:
meroctl --node <NODE> namespace create --application-id <APP_ID>
# → save the namespace-id (also a group id)
meroctl --node <NODE> context create --application-id <APP_ID> --group-id <NAMESPACE_ID>
# → save the context-id  (--group-id is required — a context is bound to a group)

# Call a method (method name is positional; context via --context)
meroctl --node <NODE> call set \
  --context <CONTEXT_ID> \
  --args '{"key":"hello","value":"world"}'

# Call a view (same form — a read-only method just reads; there is no --view flag)
meroctl --node <NODE> call get \
  --context <CONTEXT_ID> \
  --args '{"key":"hello"}'
```

## Key rules

- All `@State` fields must be CRDT types — never plain `Map`, `Set`, `Array`, or primitives
- `@View()` is **required** on every read-only method — omitting it causes unnecessary persistence
- Use `env.log()` not `console.log()` — `console` is not available in the WASM runtime
- `Counter.value()` returns `bigint`, not `number`
- `@Init` must be a static method that returns the state class instance
- `@Logic(StateClass)` must extend the state class
- No async, no I/O, no threads in app logic — the WASM runtime is synchronous
- **Windows: building is not supported natively — use WSL** (QuickJS/WASI-SDK toolchain requires
  Linux/macOS)

## Events

```typescript
import { emit } from '@calimero-network/calimero-sdk-js';

// Inside a mutation method:
emit({ type: 'ItemAdded', key: 'foo', value: 'bar' });
```

Events are pushed to all context members via WebSocket. Clients subscribe with `useSubscription`
(mero-react) or `mero.events` (mero-js) — see the `calimero-client-js` skill.

## Private storage (node-local)

```typescript
import { createPrivateEntry } from '@calimero-network/calimero-sdk-js';

// A key (string or Uint8Array) is required — it names the node-local entry.
const secret = createPrivateEntry<string>('api-key');
secret.set('my-api-key');
const val = secret.get(); // string | null
```

Private entries are never broadcast to other nodes.

## Related skills

- **`calimero-core`** — runtime concepts (context/app model, JSON-RPC protocol, WebSocket events,
  CRDT type taxonomy)
- **`calimero-meroctl`** — full `meroctl` CLI reference for deploying and testing the app
- **`calimero-client-js`** — connecting a browser/React frontend to the node (not building app
  logic)

## References

See `references/` for CRDT collections, events, and build pipeline details. See `rules/` for hard
constraints.
