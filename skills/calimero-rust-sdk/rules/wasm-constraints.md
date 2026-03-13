# Rule: WASM runtime constraints

Calimero apps run in a sandboxed WASM environment. The following are **not available**:

| Forbidden | Use instead |
| --- | --- |
| `std::thread::spawn` | Not supported — WASM is single-threaded |
| `tokio`, `async-std`, `async fn` in app logic | Not supported — all app methods are synchronous |
| `std::fs`, file I/O | Use `env::private_storage_write/read` |
| `std::net`, HTTP calls outbound | Not supported in WASM runtime |
| `println!`, `eprintln!` | Use `calimero_sdk::env::log(&str)` |
| System time (`std::time::SystemTime`) | Use `calimero_sdk::env::block_timestamp()` |
| Environment variables | Not accessible from WASM |
| Random number generation via `rand` | Use `calimero_sdk::env::random_seed()` |

## Logging

```rust
use calimero_sdk::env;

env::log("my message");
env::log(&format!("value: {}", my_value));
```

## Timestamps

```rust
use calimero_sdk::env;

let ts = env::block_timestamp(); // u64 nanoseconds
```

## Why

The `merod` WASM runtime is deterministic by design. Non-deterministic operations (threads, I/O, time, random) would break the CRDT synchronization guarantees — every node must reach the same state given the same sequence of operations.
