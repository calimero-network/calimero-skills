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
        { "name": "key",   "type": { "kind": "string" } },
        { "name": "value", "type": { "kind": "string" } }
      ]
    }
  },
  "methods": [
    {
      "name": "set",
      "params": [
        { "name": "key",   "type": { "kind": "string" } },
        { "name": "value", "type": { "kind": "string" } }
      ]
    },
    {
      "name": "get",
      "params": [
        { "name": "key", "type": { "kind": "string" } }
      ],
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
{ "$ref": "TypeName" }                    // reference to named type in types{}
{ "kind": "list", "items": { ... } }      // array
{ "kind": "map", "key": { ... }, "value": { ... } }  // map (key must be string)
{ "kind": "record", "fields": [...] }     // inline struct
```

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

## Validation rules

- `schema_version` must be exactly `"wasm-abi/1"`
- No `$ref` pointing to a type not in `types{}`
- Map keys must be string type
- All method names must be unique
- All event names must be unique
- All type names must be unique
