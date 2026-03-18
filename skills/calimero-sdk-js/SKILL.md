# calimero-sdk-js — Agent Instructions

You are helping a developer **build a Calimero P2P application in TypeScript** using
`@calimero-network/calimero-sdk-js`. The app compiles to WebAssembly and runs inside the
`merod` node runtime.

> **NOT this skill** if the developer is connecting a browser/Node.js *frontend* to a node
> (that's `calimero-client-js` / `@calimero-network/calimero-client`). This skill is for
> writing the application logic that *runs on the node*.

## Install

```bash
pnpm add @calimero-network/calimero-sdk-js
pnpm add -D @calimero-network/calimero-cli-js typescript
```

The CLI's `postinstall` hook downloads QuickJS, WASI-SDK, and Binaryen automatically.
If you used `--ignore-scripts`, re-run with `pnpm install --ignore-scripts=false`.

## Core concepts

| Concept | What it is |
| --- | --- |
| `@State` class | Persisted data — fields must be CRDT types |
| `@Logic(StateClass)` class | Entry points callable via JSON-RPC; must extend the state class |
| `@Init` static method | Seeds the initial state when context is first created |
| `@View()` method | Read-only — skips persistence; required for query methods |
| CRDT collection | Conflict-free type (`Counter`, `UnorderedMap`, etc.) — all state fields must use these |

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

| Type | Use case | Key ops |
| --- | --- | --- |
| `Counter` | Distributed counting (returns `bigint`) | `increment()`, `incrementBy(n)`, `value()` |
| `UnorderedMap<K,V>` | Key-value store (LWW per key) | `set()`, `get()`, `has()`, `remove()`, `entries()` |
| `UnorderedSet<T>` | Unique membership (LWW per element) | `add()`, `has()`, `delete()`, `toArray()` |
| `Vector<T>` | Ordered list | `push()`, `get(i)`, `pop()`, `len()` |
| `LwwRegister<T>` | Single value (timestamp LWW) | `set()`, `get()` |

Nested collections (`Map<K, Set<V>>`) propagate changes automatically — no manual
re-serialization.

## Build & deploy

```bash
# Build to WASM
npx calimero-sdk build src/index.ts -o build/service.wasm

# Install on node
meroctl --node-name <NODE> app install \
  --path build/service.wasm \
  --context-id <CONTEXT_ID>

# Call a method
meroctl --node-name <NODE> call \
  --context-id <CONTEXT_ID> \
  --method set \
  --args '{"key":"hello","value":"world"}'

# Call a view
meroctl --node-name <NODE> call \
  --context-id <CONTEXT_ID> \
  --method get \
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
- **Windows: building is not supported natively — use WSL** (QuickJS/WASI-SDK toolchain requires Linux/macOS)

## Events

```typescript
import { emit } from '@calimero-network/calimero-sdk-js';

// Inside a mutation method:
emit({ type: 'ItemAdded', key: 'foo', value: 'bar' });
```

Events are pushed to all context members via WebSocket. Clients subscribe using
`WsSubscriptionsClient` from `@calimero-network/calimero-client`.

## Private storage (node-local)

```typescript
import { createPrivateEntry } from '@calimero-network/calimero-sdk-js';

const secret = createPrivateEntry<string>();
secret.set('my-api-key');
const val = secret.get();
```

Private entries are never broadcast to other nodes.

## References

See `references/` for CRDT collections, events, and build pipeline details.
See `rules/` for hard constraints.
