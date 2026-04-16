# Rule: CRDT Types Only for Shared State

**Never use `std::collections` (Rust) or plain `Map`/`Array` (JS/TS) for shared application state.**

## Forbidden for state fields

```rust
// WRONG — will compile but cause data loss on concurrent writes:
struct AppState {
    items: std::collections::HashMap<String, String>,  // ❌
    log:   Vec<String>,                                // ❌
    seen:  std::collections::HashSet<String>,          // ❌
}
```

```typescript
// WRONG — same problem in TypeScript:
@State
class AppState {
  items: Map<string, string> = new Map();  // ❌
  log:   string[]            = [];         // ❌
}
```

## Required: use CRDT collections

```rust
// CORRECT:
use calimero_storage::collections::{UnorderedMap, Vector, LwwRegister};

struct AppState {
    items: UnorderedMap<String, LwwRegister<String>>,  // ✓
    log:   Vector<String>,                              // ✓
}
```

```typescript
// CORRECT:
import { UnorderedMap, Vector } from '@calimero-network/calimero-sdk-js/collections';

@State
class AppState {
  items: UnorderedMap<string, string> = new UnorderedMap();  // ✓
  log:   Vector<string>               = new Vector();         // ✓
}
```

## Why

Standard collections have no merge semantics. When two context members both write to a
`HashMap` while offline, merging their states is undefined — the CRDT engine cannot
resolve conflicts automatically and data will be silently lost or overwritten.

CRDT collections are designed for exactly this scenario: they guarantee that all members
converge to the same state regardless of write order or network partitions.
