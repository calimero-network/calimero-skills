# Node HTTP API (JSON-RPC + admin-api)

The Calimero node exposes **two** HTTP surfaces (plus `/health`), on the server/API port (default
**2528**):

- **`/jsonrpc`** — a JSON-RPC 2.0 endpoint used to **execute app methods**.
- **`/admin-api/...`** — REST endpoints for **management** (contexts, applications, blobs, groups,
  …).

```text
http://<node-host>:<server-port>          # default http://localhost:2528
  ├── /health                             # liveness (no auth)
  ├── /jsonrpc                            # execute app methods (JSON-RPC 2.0)
  └── /admin-api/...                      # REST management
```

All endpoints except `/health` require `Authorization: Bearer <accessToken>`. The token is issued by
the node's auth layer — **use the `calimero-client-js` / `calimero-client-py` SDKs** (or `meroctl`)
rather than hand-rolling auth and request envelopes.

---

## Application method execution (`POST /jsonrpc`)

Frontends/clients invoke WASM app logic with a JSON-RPC 2.0 request whose `method` is `"execute"`:

```text
POST /jsonrpc
Headers: Authorization: Bearer <accessToken>

Body: {
  "jsonrpc": "2.0",
  "id": "1",
  "method": "execute",
  "params": {
    "context_id": "<context-id>",
    "method": "method_name",
    "args_json": { "key": "hello" },
    "substitute": []
  }
}

Response (success): {
  "jsonrpc": "2.0",
  "id": "1",
  "result": <json-value>          // method return value (null for void)
}

Response (error): {
  "jsonrpc": "2.0",
  "id": "1",
  "error": { ... }
}
```

- `args_json` is the method arguments as a **JSON value** (object), not a double-encoded string.
- There is **no `executorPublicKey`** field; the caller identity comes from the auth token. The
  optional `substitute` list resolves `{alias}` placeholders in the payload to public keys.
- Mutations and views use the same endpoint — a "view" is just a read-only method.
- Note: the JSON-RPC `params` use the field names above (`context_id`, `args_json`). The mero-js /
  mero-react SDK exposes camelCase wrappers and handles the envelope for you.

---

## Context management (`/admin-api`)

```text
GET    /admin-api/contexts                       # list contexts
POST   /admin-api/contexts                       # create context  { applicationId, ... }
GET    /admin-api/contexts/:context_id           # get context details
DELETE /admin-api/contexts/:context_id           # delete context
POST   /admin-api/contexts/:context_id/join      # join a context
GET    /admin-api/contexts/:context_id/identities # context identities
POST   /admin-api/contexts/sync                  # trigger sync
```

## Application management (`/admin-api`)

```text
GET  /admin-api/applications                     # list installed apps
GET  /admin-api/applications/:application_id      # get app details
GET  /admin-api/applications/:application_id/versions
```

(Installation is typically done via `meroctl app install` or the registry; see the
`calimero-meroctl` and `calimero-registry` skills.)

## Other admin-api surfaces

`/admin-api/blobs`, `/admin-api/groups/...` (group membership, roles, invites, ownership proofs) —
see the `calimero-core` namespaces/groups reference and the client SDKs.

---

## WebSocket endpoint

```text
ws://localhost:2528/ws
```

After connecting, subscribe:

```json
{ "action": "subscribe", "contextIds": ["<context-id>"] }
```

The node pushes context events — see `websocket-events.md` for the current event set
(`StateMutation`, `SyncStatus`, `AppVersionChanged`, `XCall`).

---

## Error codes

| HTTP status | Meaning                                                       |
| ----------- | ------------------------------------------------------------- |
| `400`       | Bad request — malformed JSON, missing fields                  |
| `401`       | Unauthorized — missing or expired access token                |
| `403`       | Forbidden — identity not a context member                     |
| `404`       | Not found — unknown context or application ID                 |
| `500`       | Internal server error — WASM execution panic or storage error |

On `401`, refresh the access token and retry (the SDKs do this automatically).
