# Rule: mero-js admin-api uses camelCase — not snake_case

`@calimero-network/mero-js` v2 (`>=2.0.0-beta.1`) uses **camelCase** field names
for all **admin-api** request/response objects (`mero.admin.*`) — the v1
snake_case keys are gone.

## WRONG (v1 / old code):

```typescript
await mero.admin.createContext({
  application_id: appId,   // ✗
  group_id: namespaceId,   // ✗
});
```

## CORRECT (v2):

```typescript
await mero.admin.createContext({
  applicationId: appId,    // ✓
  groupId: namespaceId,    // ✓
});
```

## Affected types

- All `mero.admin.*` request types: `CreateContextRequest`
  (`applicationId`, `groupId`, …), `CreateNamespaceRequest` (`applicationId`),
  the alias requests (`contextId`, `applicationId`), etc.
- Admin response shapes are camelCase too: `{ contextId, memberPublicKey }`,
  `{ identities }`, `{ blobId, size }`, …

## Exception: the auth-api is still snake_case

The **auth-api** (`mero.auth.*`) and the auth-callback wire format are NOT
camelCase — they mirror the auth server's protocol. These keep snake_case:

- `TokenRequest` / `RefreshTokenRequest` — `access_token`, `refresh_token`,
  `public_key`, `auth_method`
- `GenerateClientKeyRequest` — `context_id`, `context_identity`,
  `target_node_url`
- The auth-callback hash params parsed by `parseAuthCallback` — `access_token`,
  `context_id`, `context_identity`, `node_url`, `application_id`

> You rarely call `mero.auth.*` directly — `MeroProvider` handles token
> generation/refresh. When you do, use snake_case for those request bodies.

## Why this matters

The v2 admin-api does not alias the old snake_case keys. Passing `context_id` to
`mero.admin.*` silently sends `undefined` to the server, which returns a cryptic
error rather than a clear "wrong field name" message.

## How to detect if a codebase is on the right SDK

Check `package.json`:

- `"@calimero-network/mero-react"` (re-exports mero-js) or
  `"@calimero-network/mero-js": "^2.x"` → correct. Use camelCase for `admin`,
  snake_case for the `auth` request bodies above.
- `"@calimero-network/calimero-client"` → **DEPRECATED / forbidden** in
  generated apps. Migrate to mero-react / mero-js.
