# ABI Manifest Format

The input `abi.json` follows the `wasm-abi/1` schema.

## Minimal valid ABI

```json
{
  "schema_version": "wasm-abi/1",
  "types": {},
  "methods": [],
  "events": []
}
```

## Full example — KV Store ABI

```json
{
  "schema_version": "wasm-abi/1",
  "types": {
    "Entry": {
      "kind": "record",
      "fields": [
        { "name": "key", "type": { "kind": "string" } },
        { "name": "value", "type": { "kind": "string" } }
      ]
    }
  },
  "methods": [
    {
      "name": "set",
      "params": [
        { "name": "key", "type": { "kind": "string" } },
        { "name": "value", "type": { "kind": "string" } }
      ]
    },
    {
      "name": "get",
      "params": [{ "name": "key", "type": { "kind": "string" } }],
      "returns": { "kind": "string" },
      "returns_nullable": true
    },
    {
      "name": "entries",
      "params": [],
      "returns": { "kind": "list", "items": { "$ref": "Entry" } }
    }
  ],
  "events": [
    {
      "name": "ItemSet",
      "payload": { "$ref": "Entry" }
    }
  ]
}
```

## Type reference forms

```json
{ "kind": "string" }                      // scalar
{ "kind": "bool" }
{ "kind": "u32" }
{ "kind": "u64" }
{ "kind": "bytes", "encoding": "hex" }    // variable bytes
{ "kind": "bytes", "size": 32 }           // fixed-length bytes, e.g. [u8; 32]
{ "$ref": "TypeName" }                    // reference to named type in types{}
{ "kind": "list", "items": { ... } }      // array
{ "kind": "map", "key": { ... }, "value": { ... } }  // map (key must be string)
{ "kind": "record", "fields": [...] }     // inline struct
{ "kind": "tuple", "elements": [ ... ] }  // fixed-arity tuple
{ "kind": "alias", "target": { ... } }    // named alias (in types{})
```

**Not expressible** (will fail codegen): fixed-size arrays of non-byte elements `[T; N]`, standalone
sets, and enums inlined into a field/param type. Use `list` for sequences, model sets via a
`crdt_type` marker (below) or a `map`, and reference enums by `$ref` to a named `variant` type.
(Fixed-size **byte** arrays `[u8; N]` _are_ expressible as `{ "kind": "bytes", "size": N }`.)

### CRDT type markers

A `record`/`map`/`list` that backs a CRDT collection carries a `crdt_type` (a `record` may also
carry an `inner_type`; `inner_type` is only valid on `record`). Valid `crdt_type` values:
`lww_register`, `unordered_map`, `unordered_set`, `vector`, `counter`, `replicated_growable_array`,
`authored_map`, `authored_vector`, and **(0.11)** `sorted_map`, `sorted_set`, `shared_storage`.

> `shared_storage` is the **ABI wire tag** (core's `CrdtCollectionType::SharedStorage`, serialized
> snake_case) for the Rust `WriterSetCell` collection. The wire tag keeps the `shared_storage` name;
> only the Rust type is named `WriterSetCell` — they are deliberately not the same string.

## Type definitions (`types` object)

```json
"types": {
  "MyStruct": {
    "kind": "record",
    "fields": [
      { "name": "id",    "type": { "kind": "u64" } },
      { "name": "name",  "type": { "kind": "string" } },
      { "name": "tags",  "type": { "kind": "list", "items": { "kind": "string" } } }
    ]
  },
  "Status": {
    "kind": "variant",
    "variants": [
      { "name": "Active" },
      { "name": "Inactive" },
      { "name": "Pending", "payload": { "kind": "string" } }
    ]
  }
}
```

## 0.11 manifest & method fields

Optional top-level and per-method fields added in 0.11 (all optional — older manifests stay valid):

```json
{
  "schema_version": "wasm-abi/1",
  "state_version": 2, // app state schema version (integer ≥ 1; defaults to 1 if absent)
  "migrations": [
    // migration entries for chained dispatch (code-only releases): each names
    // the migration method and the state version it upgrades FROM
    { "method": "migrate_v1_to_v2", "fromVersion": 1 }
  ],
  "types": {},
  "methods": [
    {
      "name": "set",
      "params": [],
      "intent": "mutating", // "read_only" (#[app::view]) | "mutating" | "unspecified"
      "xcall_callable": false // true ⇒ callable via cross-context xcall (#[app::xcall])
    }
  ],
  "events": []
}
```

- `intent` controls the node's locking strategy (read-only methods take a shared lock); defaults to
  `unspecified` (fail-safe = treated as mutating).
- `xcall_callable` gates whether another context may `xcall` this method; defaults to `false`.

## Validation rules

- `schema_version` must be exactly `"wasm-abi/1"`
- No `$ref` pointing to a type not in `types{}` (raw Rust types like `u64`, `Vec<T>`, `Option<T>`
  are allowed as `$ref` values — only truly unknown names are rejected)
- Map keys must be string type
- Method names must be unique among methods
- Event names must be unique among events
- Type names must be unique among types (uniqueness is checked per-collection, not across them)
