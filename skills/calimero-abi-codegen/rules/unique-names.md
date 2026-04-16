# Rule: Method, event, and type names must all be unique

The ABI validator rejects manifests where names clash — across methods, events, and types.

## WRONG — duplicate method names:

```json
{
  "methods": [
    { "name": "get", "params": [...] },
    { "name": "get", "params": [...] }
  ]
}
```

## WRONG — type name same as method name:

```json
{
  "types": {
    "set": { "kind": "record", "fields": [] }
  },
  "methods": [{ "name": "set", "params": [] }]
}
```

## WRONG — map key is not string:

```json
{
  "kind": "map",
  "key": { "kind": "u64" },
  "value": { "kind": "string" }
}
```

Map keys **must** be `{ "kind": "string" }`.

## WRONG — dangling $ref:

```json
{
  "types": {},
  "methods": [{ "name": "get", "returns": { "$ref": "NonExistentType" } }]
}
```

Every `$ref` must point to a name defined in the `types` object.
