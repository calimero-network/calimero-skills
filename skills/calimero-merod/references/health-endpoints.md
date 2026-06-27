# Health Endpoints and API Discovery

## Health check

```text
GET http://localhost:2528/admin-api/health
```

The health route lives under the admin-api surface — it is `/admin-api/health`, NOT a top-level
`/health`. Returns `200 OK` with a JSON body when the node is running and ready.

```json
{ "data": { "status": "alive" } }
```

> **Note:** The status value is `"alive"`, not `"healthy"`, and it is nested under a `data` object.
> Code that checks for a top-level `"healthy"` (or a top-level `status`) will incorrectly treat a
> live node as unhealthy.

## Wait for node ready (shell)

```bash
until curl -sf http://localhost:2528/admin-api/health > /dev/null; do
  echo "waiting for node..."
  sleep 1
done
echo "node is ready"
```

## Wait for node ready (CI — GitHub Actions)

```yaml
- name: Wait for node
  run: |
    for i in $(seq 1 30); do
      if curl -sf http://localhost:2528/admin-api/health; then
        echo "Node ready"
        break
      fi
      echo "Waiting... ($i/30)"
      sleep 2
    done
```

---

## API layout

The node serves two distinct HTTP API surfaces:

- **`/jsonrpc`** — JSON-RPC 2.0 endpoint for executing app methods (`method: "execute"`).
- **`/admin-api/...`** — REST management endpoints (contexts, applications, blobs, groups, …). The
  liveness route `/admin-api/health` lives here too (no auth required).

Clients authenticate with `Authorization: Bearer <accessToken>`; `/admin-api/health` needs no auth.
Prefer the `calimero-client-js` / `calimero-client-py` SDKs over hand-rolling these paths.

## Key API paths

| Path                                      | Method | Purpose                                |
| ----------------------------------------- | ------ | -------------------------------------- |
| `/admin-api/health`                       | GET    | Node liveness check (no auth required) |
| `/jsonrpc`                                | POST   | Execute an app method (JSON-RPC 2.0)   |
| `/admin-api/contexts`                     | GET    | List contexts                          |
| `/admin-api/contexts`                     | POST   | Create context                         |
| `/admin-api/contexts/:context_id`         | DELETE | Delete a context                       |
| `/admin-api/applications`                 | GET    | List installed apps                    |
| `/admin-api/applications/:application_id` | GET    | Get an installed app                   |
| `/admin-api/blobs`                        | GET    | List blobs                             |

WebSocket: `ws://localhost:2528/ws` (subscriptions / streamed events)

---

## Docker health check

```dockerfile
HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
  CMD curl -sf http://localhost:2528/admin-api/health || exit 1
```

## Docker Compose health check

```yaml
services:
  node:
    image: ghcr.io/calimero-network/merod:edge
    healthcheck:
      test: ['CMD', 'curl', '-sf', 'http://localhost:2528/admin-api/health']
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 10s
```
