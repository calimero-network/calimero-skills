# Rule: mero-js v2 uses camelCase — not snake_case

`@calimero-network/mero-js` v2 (`>=2.0.0-beta.1`) changed all request object field names from
`snake_case` to `camelCase`.

## WRONG (v1 / old code):

```typescript
await client.generateClientKey({
  context_id: contextId, // ✗
  context_identity: identity, // ✗
});
```

## CORRECT (v2):

```typescript
await client.generateClientKey({
  contextId: contextId, // ✓
  contextIdentity: identity, // ✓
});
```

## Affected types

- `GenerateClientKeyRequest` — `contextId`, `contextIdentity`
- All other request types in the v2 API

## Why this matters

The v2 mero-js package does not alias the old snake_case keys. Passing `context_id` silently sends
`undefined` to the server, which returns a cryptic error rather than a clear "wrong field name"
message.

## How to detect if a codebase is on v1 or v2

Check `package.json`:

- `"@calimero-network/mero-js": "^2.0.0-beta.1"` or higher → v2, use camelCase
- `"@calimero-network/calimero-client": "..."` → original client, check its docs
