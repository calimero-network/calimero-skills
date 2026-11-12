# Rule: derive `Record` or `AbiType` on every type a method exchanges

The state struct takes no derives: `#[app::state]` generates what it needs, and state is not
serialized as a whole (no borsh, no `BorshSerialize`/`BorshDeserialize`).

Every struct or enum in a method's arguments or result, or in an error or event, derives **one** of:

- `#[derive(Record)]` with `#[table(..)]` for a table row. It writes its own serde: do not also
  derive `Serialize`/`Deserialize`.
- `#[derive(serde::Serialize, serde::Deserialize, AbiType)]` for any other serde struct or enum.

The derive writes the type's JSON shape into the ABI's `types`, which is all a generated client
knows: a type with neither is `unknown` in TypeScript.

```rust
use calimero_sdk::prelude::*;

#[derive(Record, Clone, Debug)]
#[table(key = "id")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub done: bool,
}

#[derive(serde::Serialize, serde::Deserialize, AbiType, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    pub open: u32,
    pub done: u32,
    #[serde(with = "calimero_sdk::json::u64_str")]
    pub updated_ms: u64,
}
```

- `u64`, `i64` and `Vec<u8>` travel as a decimal string and base64url. At the top level of
  arguments, results, record fields, error and event fields the macros handle that; inside a plain
  serde type (`AbiType`) give the field `#[serde(with = "calimero_sdk::json::u64_str")]`. Nested in
  a container (`Vec<u64>`, `BTreeMap<String, i64>`) they are a compile error: wrap them in a
  `Record` or send strings.
- Values stored in a collection (`UnorderedMap<String, V>`, `Cell<V>`) need serde only.
