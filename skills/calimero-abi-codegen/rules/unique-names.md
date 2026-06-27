# Rule: Method, event, and type names must each be unique within their own collection

The ABI validator rejects manifests with duplicate names **within** a collection: two methods with
the same name, two events with the same name, or two type definitions with the same name. (Names are
checked per-collection — the validator does _not_ reject a type and a method that happen to share a
name. JSON object keys also can't repeat, so a duplicate type name is structurally impossible.)

## WRONG — duplicate method names:

```json
{
  "methods": [
    { "name": "get", "params": [...] },
    { "name": "get", "params": [...] }
  ]
}
```

## WRONG — duplicate event names:

```json
{
  "events": [{ "name": "ItemSet" }, { "name": "ItemSet" }]
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
