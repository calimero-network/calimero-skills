# Rule: State struct must derive Default, BorshDeserialize, BorshSerialize

The three derives are all required. Missing any one of them causes a **runtime panic**,
not a compile error — the app will install and start, then crash when the context is
first accessed.

## WRONG — missing derives:

```rust
// ✗ Missing all derives — runtime panic on first call
pub struct AppState {
    items: UnorderedMap<String, String>,
}

// ✗ Missing BorshSerialize — state cannot be persisted
#[derive(Default, BorshDeserialize)]
pub struct AppState {
    items: UnorderedMap<String, String>,
}
```

## CORRECT:

```rust
#[derive(Default, BorshDeserialize, BorshSerialize)]
pub struct AppState {
    items: UnorderedMap<String, String>,
}
```

## What each derive does

| Derive | Required for |
| --- | --- |
| `Default` | `#[app::init]` calls `AppState::default()` as the baseline |
| `BorshDeserialize` | Loading state from node storage on every method call |
| `BorshSerialize` | Saving state to node storage after every mutation |

## Import

```rust
use calimero_sdk::borsh::{BorshDeserialize, BorshSerialize};
```

Do not use `borsh` crate directly — import from `calimero_sdk::borsh` to ensure
version compatibility.
