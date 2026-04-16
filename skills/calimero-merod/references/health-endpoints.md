# Health Endpoints and API Discovery

## Health check

```text
GET http://localhost:2428/health
```

Returns `200 OK` with a JSON body when the node is running and ready.

```json
{ "status": "alive" }
```

> **Note:** The status value is `"alive"`, not `"healthy"`. Code that checks for `"healthy"` will
> incorrectly treat a live node as unhealthy.

## Wait for node ready (shell)

```bash
until curl -sf http://localhost:2428/health > /dev/null; do
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
      if curl -sf http://localhost:2428/health; then
        echo "Node ready"
        break
      fi
      echo "Waiting... ($i/30)"
      sleep 2
    done
```

---

## API base URL

```text
http://localhost:2428/api/v0/
```

All management endpoints are under `/api/v0/`. Clients must authenticate with
`Authorization: Bearer <accessToken>` on all endpoints except `/api/v0/identity/login`.

## Key API paths

| Path                            | Method | Purpose                                |
| ------------------------------- | ------ | -------------------------------------- |
| `/health`                       | GET    | Node liveness check (no auth required) |
| `/api/v0/identity/login`        | POST   | Get access + refresh tokens            |
| `/api/v0/identity/refresh`      | POST   | Refresh access token                   |
| `/api/v0/contexts`              | GET    | List contexts                          |
| `/api/v0/contexts`              | POST   | Create context                         |
| `/api/v0/contexts/{id}/execute` | POST   | Call app method                        |
| `/api/v0/applications`          | GET    | List installed apps                    |
| `/api/v0/applications`          | POST   | Install app (multipart)                |

WebSocket: `ws://localhost:2428/ws`

---

## Docker health check

```dockerfile
HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
  CMD curl -sf http://localhost:2428/health || exit 1
```

## Docker Compose health check

```yaml
services:
  node:
    image: calimero/merod:latest
    healthcheck:
      test: ['CMD', 'curl', '-sf', 'http://localhost:2428/health']
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 10s
```
