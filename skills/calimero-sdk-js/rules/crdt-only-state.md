# Rule: All @State fields must be CRDT types

Every field on a `@State` class must be a CRDT collection from
`@calimero-network/calimero-sdk-js/collections`. Plain JavaScript types are not
persisted or synchronized.

## WRONG — plain JS types in state:

```typescript
@State
export class AppState {
  items: Map<string, string> = new Map();   // ✗ — not a CRDT, not synced
  tags: string[] = [];                       // ✗ — not a CRDT, not synced
  name: string = '';                         // ✗ — use LwwRegister instead
  count: number = 0;                         // ✗ — use Counter instead
}
```

## CORRECT — CRDT types:

```typescript
@State
export class AppState {
  items: UnorderedMap<string, string> = new UnorderedMap();
  tags: UnorderedSet<string> = new UnorderedSet();
  name: LwwRegister<string> = new LwwRegister();
  count: Counter = new Counter();
}
```

## Why this matters

Plain JS types are not serialized to the node's CRDT storage. State that uses
`Map`, `Set`, `Array`, or primitives directly will be lost on the next call and
will never sync to other nodes in the context.

## Choosing the right CRDT

| Data shape | Use |
| --- | --- |
| Counting (monotonic) | `Counter` |
| Key-value lookup | `UnorderedMap<K, V>` |
| Unique membership | `UnorderedSet<T>` |
| Ordered list | `Vector<T>` |
| Single value (overwrites) | `LwwRegister<T>` |
| User-owned signed data | `UserStorage<T>` |
| Immutable content | `FrozenStorage<T>` |
