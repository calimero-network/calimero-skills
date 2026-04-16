# JSON-RPC Protocol

The Calimero node exposes its application and admin APIs over HTTP/REST at
`http://localhost:2428/api/v0/` by default.

## Base URL

```
http://<node-host>:<server-port>/api/v0
```

Default: `http://localhost:2428/api/v0`

All endpoints require `Authorization: Bearer <accessToken>` except `/identity/login`.

---

## Authentication endpoints

### Login

```
POST /api/v0/identity/login

Body: { "username": "admin", "password": "..." }

Response: {
  "accessToken":  "eyJ...",
  "refreshToken": "eyJ..."
}
```

### Refresh

```
POST /api/v0/identity/refresh

Body: { "refreshToken": "eyJ..." }

Response: { "accessToken": "eyJ..." }
```

---

## Application method execution

This is how frontends and clients invoke WASM app logic.

### Execute a method (mutation or view)

```
POST /api/v0/context/{contextId}/execute

Headers:
  Authorization: Bearer <accessToken>

Body: {
  "method": "method_name",
  "argsJson": "{\"key\":\"hello\"}",
  "executorPublicKey": "<base58-identity-pubkey>"
}

Response (success): {
  "output": <json-value>        // method return value, null for void
}

Response (error): {
  "error": {
    "cause": {
      "info": { "message": "..." }
    }
  }
}
```

- `argsJson` is a **JSON string** (double-encoded) — not an inline object.
- `executorPublicKey` is the base58 public key of the identity making the call.
- Mutations and views use the same endpoint; views skip state persistence. The `mero-js` /
  `mero-react` SDK handles this transparently.

---

## Context management endpoints

### List contexts

```
GET /api/v0/contexts

Response: [
  { "id": "<context-id>", "applicationId": "<app-id>", ... },
  ...
]
```

### Get context details

```
GET /api/v0/contexts/{contextId}
```

### Create context

```
POST /api/v0/contexts

Body: { "applicationId": "<app-id>" }

Response: { "id": "<context-id>" }
```

### Delete context

```
DELETE /api/v0/contexts/{contextId}
```

---

## Application management endpoints

### List installed applications

```
GET /api/v0/applications
```

### Install application from local file

```
POST /api/v0/applications
Content-Type: multipart/form-data

file: <wasm-binary>

Response: { "applicationId": "<id>" }
```

### Get application details

```
GET /api/v0/applications/{applicationId}
```

---

## Identity endpoints

### List identities

```
GET /api/v0/identities
```

### Create identity

```
POST /api/v0/identities

Response: { "publicKey": "<base58>", "privateKey": "<base58>" }
```

---

## WebSocket endpoint

```
ws://localhost:2428/ws
```

After connecting, send a subscribe message:

```json
{ "action": "subscribe", "contextIds": ["<context-id>"] }
```

The node will push `ExecutionEvent` and `StateMutation` messages. See `websocket-events.md` for the
full schema.

---

## Error codes

| HTTP status | Meaning                                                       |
| ----------- | ------------------------------------------------------------- |
| `400`       | Bad request — malformed JSON, missing fields                  |
| `401`       | Unauthorized — missing or expired access token                |
| `403`       | Forbidden — identity not a context member                     |
| `404`       | Not found — unknown context or application ID                 |
| `500`       | Internal server error — WASM execution panic or storage error |

On `401`, refresh the access token and retry.
