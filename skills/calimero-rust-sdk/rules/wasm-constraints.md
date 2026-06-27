# Rule: WASM runtime constraints

Calimero apps run in a sandboxed WASM environment. The following are **not available**:

| Forbidden                                     | Use instead                                          |
| --------------------------------------------- | ---------------------------------------------------- |
| `std::thread::spawn`                          | Not supported — WASM is single-threaded              |
| `tokio`, `async-std`, `async fn` in app logic | Not supported — all app methods are synchronous      |
| `std::fs`, file I/O                           | `#[app::private]` storage, or the `env::blob_*` API  |
| `std::net`, HTTP calls outbound               | Not supported in WASM runtime                        |
| `println!`, `eprintln!`                       | `app::log!(...)` (or `calimero_sdk::env::log(&str)`) |
| System time (`std::time::SystemTime`)         | `calimero_sdk::env::time_now()`                      |
| Environment variables                         | Not accessible from WASM                             |
| Random number generation via `rand`           | `calimero_sdk::env::random_bytes(&mut buf)`          |

All of the `env::*` replacements above are real functions exported from `calimero_sdk::env`. The
same set is also re-exported from `calimero_storage::env` for use inside storage/collection code
(e.g. `storage_env::time_now()`).

## Logging

```rust
use calimero_sdk::app;

app::log!("my message");
app::log!("value: {}", my_value);   // format args, like println!
```

`app::log!` is the idiomatic macro; it forwards to `calimero_sdk::env::log(&str)`, which you may
also call directly with a `&str`.

## Timestamps

```rust
use calimero_sdk::env;

let ts = env::time_now(); // u64 — nanosecond timestamp
```

## Randomness

```rust
use calimero_sdk::env;

let mut buf = [0u8; 32];
env::random_bytes(&mut buf); // fills the buffer with random bytes
```

## Why

The `merod` WASM runtime is deterministic by design. Non-deterministic operations (threads, I/O,
time, random) are routed through host functions so the node controls them — every node must reach
the same state given the same sequence of operations.
