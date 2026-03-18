# CRDT Collections

All persistent state in a `calimero-sdk-js` app must use CRDT types from
`@calimero-network/calimero-sdk-js/collections`.

## Counter (G-Counter)

Distributed counting. The value is the sum across all contributing nodes.

```typescript
import { Counter } from '@calimero-network/calimero-sdk-js/collections';

const counter = new Counter();
counter.increment();            // +1
counter.incrementBy(5n);        // +5 (bigint)
const total = counter.value();  // bigint
```

> Counter values are always `bigint`. Do not compare with `=== 0` — use `=== 0n`.

## UnorderedMap\<K, V\>

Key-value store with Last-Write-Wins conflict resolution per key.

```typescript
import { UnorderedMap } from '@calimero-network/calimero-sdk-js/collections';

const map = new UnorderedMap<string, string>();
map.set('key', 'value');
const val = map.get('key');       // 'value' | undefined
const exists = map.has('key');    // boolean
map.remove('key');
const all = map.entries();        // [['key', 'value'], ...]
```

## UnorderedSet\<T\>

Set of unique values with Last-Write-Wins per element.

```typescript
import { UnorderedSet } from '@calimero-network/calimero-sdk-js/collections';

const set = new UnorderedSet<string>();
set.add('item');          // true on first insert, false if already present
set.has('item');          // true
set.delete('item');
const items = set.toArray();
```

## Vector\<T\>

Ordered list. Conflicts resolved by position.

```typescript
import { Vector } from '@calimero-network/calimero-sdk-js/collections';

const vec = new Vector<string>();
vec.push('first');
vec.push('second');
const item = vec.get(0);   // 'first'
const last = vec.pop();    // 'second'
const len = vec.len();     // 1 (bigint)
```

## LwwRegister\<T\>

Holds a single value. Last write wins based on timestamp.

```typescript
import { LwwRegister } from '@calimero-network/calimero-sdk-js/collections';

const reg = new LwwRegister<string>();
reg.set('current value');
const current = reg.get(); // 'current value' | undefined
```

## UserStorage

User-owned signed data. Writes are verified by the owner's signature.

```typescript
import { UserStorage } from '@calimero-network/calimero-sdk-js/collections';

const storage = new UserStorage<string>();
storage.set(executorId, 'my value');
const val = storage.get(executorId);
```

## FrozenStorage

Immutable, content-addressed storage. Write once; content never changes.

```typescript
import { FrozenStorage } from '@calimero-network/calimero-sdk-js/collections';

const frozen = new FrozenStorage<string>();
const id = frozen.store('immutable content');
const val = frozen.get(id);
```

## Nested collections

Nested structures propagate changes automatically — no manual re-serialization needed.

```typescript
// Map<projectId, Set<tags>> — just works
const projectTags = new UnorderedMap<string, UnorderedSet<string>>();

const tags = new UnorderedSet<string>();
tags.add('urgent');
projectTags.set('proj:123', tags);

// Modifying the inner set propagates automatically
projectTags.get('proj:123')?.add('high-priority');
```

## State field initialization

CRDT fields must be initialized inline in the `@State` class:

```typescript
@State
export class AppState {
  // ✅ Inline initialization
  items: UnorderedMap<string, string> = new UnorderedMap();
  count: Counter = new Counter();

  // ❌ Never use plain JS types for state
  // plainMap: Map<string, string> = new Map();
  // array: string[] = [];
}
```
