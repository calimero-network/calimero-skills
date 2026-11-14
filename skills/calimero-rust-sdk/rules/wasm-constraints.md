# Rule: runtime constraints in a component

An app is a `calimero:app` component (`wasm32-wasip2`) run by the node's wasmtime engine on the
cluster's leader. Every logged run must be deterministic: the leader runs a call once, the replicas
apply its diff, and the test harness replays it with the same seed.

| Reaching for                                                                         | What happens                                      | Use instead                                                           |
| ------------------------------------------------------------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------- |
| `std::time::SystemTime::now()` / `Instant`                                           | not the log's time: replicas and replays disagree | `env::time_now()` (**milliseconds**, the log entry's timestamp)       |
| `rand::thread_rng()`, `getrandom`                                                    | not reproducible                                  | `env::random_bytes(n)`                                                |
| an id from a counter or the clock                                                    | collisions, extra reads and writes                | `env::unique_id()`                                                    |
| `std::thread::spawn`, `async`, a runtime                                             | no threads, no executor in a run                  | sequential code; long work in an `#[app::action]`                     |
| `std::fs`, sockets, `reqwest`                                                        | no filesystem or network in a run                 | `calimero_sdk::files` (sealed blobs), `env::fetch` for approved HTTP  |
| `println!` / `eprintln!`                                                             | goes nowhere useful                               | `env::log(&format!(..))` (64 KiB per run)                             |
| `panic!`, `.unwrap()` on user input, `&s[..n]` on UTF-8                              | a trap: the call fails as `422 TRAP`              | return an `#[app::error]` variant; `s.chars().take(n).collect()`      |
| `std::collections::HashMap` as a state field                                         | not a collection handle                           | `UnorderedMap`, `Set`, `Vector`, `Table`, `Cell<T>` for a small value |
| `calimero_storage::*`, `LwwRegister`, `UserStorage`, `#[app::private]`, `app::emit!` | does not exist: SDK 0.12 is gone                  | the component SDK's collections, `PerUser<T>`, `env::emit`            |
| a `wasm32-unknown-unknown` build, `cargo mero build`                                 | an SDK 0.12 module: nodes refuse it               | `meroctl app build` (`wasm32-wasip2` component)                       |

A run's log entry is capped at 1 MiB, and a key over 1 KiB is refused (`KeyTooLong`). A failed call
writes nothing and emits nothing.
