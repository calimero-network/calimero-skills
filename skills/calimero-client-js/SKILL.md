# calimero-client-js — Agent Instructions

You are helping a developer connect a **browser or Node.js frontend** to a Calimero node using `@calimero-network/calimero-client` or `@calimero-network/mero-js`.

## Package versions

| Package | Version | Notes |
| --- | --- | --- |
| `@calimero-network/calimero-client` | latest | Stable client for browser/Node — auth, RPC, WebSocket |
| `@calimero-network/mero-js` | `>=2.0.0-beta.1` | v2 API — all request fields are **camelCase** |

## Critical: mero-js v2 uses camelCase

v2 changed all request field names from `snake_case` to `camelCase`.

```typescript
// WRONG (v1 / old):
{ context_id: '...', context_identity: '...' }

// CORRECT (v2):
{ contextId: '...', contextIdentity: '...' }
```

This applies to `GenerateClientKeyRequest` and all other request types.

## Install

```bash
pnpm add @calimero-network/calimero-client
# or
pnpm add @calimero-network/mero-js
```

## Core workflow

1. Read auth tokens (from URL hash if opened by Desktop, otherwise prompt login)
2. Initialize client with `node_url` + tokens
3. Call app methods via JSON-RPC
4. Subscribe to events via WebSocket

## References

See `references/` for auth flow, RPC calls, WebSocket events, and SSO.
See `rules/` for camelCase API and token refresh requirements.
