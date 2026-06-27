# CRDT Collections

All persistent state in a `calimero-sdk-js` app must use CRDT types from
`@calimero-network/calimero-sdk-js/collections`.

## Counter (G-Counter)

Distributed counting. The value is the sum across all contributing nodes.

```typescript
import { Counter } from '@calimero-network/calimero-sdk-js/collections';

const counter = new Counter();
counter.increment(); // +1
counter.incrementBy(5n); // +5 (bigint)
const total = counter.value(); // bigint
```

> Counter values are always `bigint`. Do not compare with `=== 0` — use `=== 0n`.

## UnorderedMap\<K, V\>

Key-value store with Last-Write-Wins conflict resolution per key.

```typescript
import { UnorderedMap } from '@calimero-network/calimero-sdk-js/collections';

const map = new UnorderedMap<string, string>();
map.set('key', 'value');
const val = map.get('key'); // 'value' | null
const exists = map.has('key'); // boolean
map.remove('key');
const all = map.entries(); // [['key', 'value'], ...]
```

## UnorderedSet\<T\>

Set of unique values with Last-Write-Wins per element.

```typescript
import { UnorderedSet } from '@calimero-network/calimero-sdk-js/collections';

const set = new UnorderedSet<string>();
set.add('item'); // true on first insert, false if already present
set.has('item'); // true
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
const item = vec.get(0); // 'first'
const last = vec.pop(); // 'second'
const len = vec.len(); // 1 (number)
```

## LwwRegister\<T\>

Holds a single value. Last write wins based on timestamp.

```typescript
import { LwwRegister } from '@calimero-network/calimero-sdk-js/collections';

const reg = new LwwRegister<string>();
reg.set('current value');
const current = reg.get(); // 'current value' | null
```

## UserStorage

Per-user, owner-signed data. The key is always the **current executor's** PublicKey — you write
your own slot and read anyone's. Writes are signed by Calimero Core's storage layer and signature /
replay-protection are enforced when actions sync to other nodes.

```typescript
import { UserStorage } from '@calimero-network/calimero-sdk-js/collections';

const storage = new UserStorage<string>();

// Write for the current executor (key is set automatically). Returns the previous value or null.
storage.insert('my value');

// Read the current executor's value
const mine = storage.get(); // string | null

// Read another user's value by their 32-byte PublicKey
const theirs = storage.getForUser(somePublicKey); // string | null

// Membership checks and removal (current executor)
storage.containsCurrentUser(); // boolean
storage.containsUser(somePublicKey); // boolean
storage.remove(); // removes current executor's value; returns previous or null
```

## FrozenStorage

Immutable, content-addressed storage. Write once; content never changes.

```typescript
import { FrozenStorage } from '@calimero-network/calimero-sdk-js/collections';

const frozen = new FrozenStorage<string>();
const hash = frozen.add('immutable content'); // returns the 32-byte SHA-256 content hash
const val = frozen.get(hash); // string | null
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
