# Rule: Use env.log() — not console.log()

`console` is not available in the QuickJS/WASM runtime. Calling `console.log()` will throw a runtime
error. Use `env.log()` from the SDK's env module instead.

## WRONG:

```typescript
console.log('Processing item:', key); // ✗ — throws at runtime
console.error('Something went wrong'); // ✗ — throws at runtime
```

## CORRECT:

```typescript
import * as env from '@calimero-network/calimero-sdk-js/env';

env.log(`Processing item: ${key}`); // ✓ — output appears in node logs
env.log(`Error: ${error}`); // ✓
```

## env.log() format

`env.log()` accepts a single string. Use template literals for dynamic values:

```typescript
env.log(`set called: key=${key}, value=${value}`);
env.log(`counter is now ${this.count.value()}`);
```

## Other env utilities

```typescript
import * as env from '@calimero-network/calimero-sdk-js/env';

// Get the calling executor's public key (Uint8Array, 32 bytes)
const executorId = env.executorId();
```
