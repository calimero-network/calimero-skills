# Rule: @View() is required on read-only methods

Every method that does not modify state must be decorated with `@View()`. Without it, the runtime
will persist state after every call — even when nothing changed — causing unnecessary storage writes
and cross-node syncs.

## WRONG — read-only method without @View():

```typescript
@Logic(AppState)
export class AppLogic extends AppState {
  // ✗ — no @View(), triggers persistence on every call
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  // ✗ — returning a count without @View()
  getCount(): bigint {
    return this.count.value();
  }
}
```

## CORRECT:

```typescript
@Logic(AppState)
export class AppLogic extends AppState {
  @View()
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  @View()
  getCount(): bigint {
    return this.count.value();
  }
}
```

## How to tell if a method needs @View()

A method is read-only if it:

- Does not call any mutation methods on CRDT fields (`set`, `insert`, `add`, `push`, `increment`,
  etc.)
- Does not call `emit()` or `emitWithHandler()`
- Only reads values and returns results
