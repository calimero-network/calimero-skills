# Authentication & Token Caching

The Python client automatically manages JWT tokens — loading from cache, using them in
requests, and refreshing on 401.

## Token cache location

```
~/.merobox/auth_cache/{sanitized_node_name}-{hash}.json
```

```python
from calimero_client_py import get_token_cache_path, get_token_cache_dir

path = get_token_cache_path("my-node")
# ~/.merobox/auth_cache/my-node-a1b2c3d4.json
```

## First-time authentication

On the first run there are no cached tokens. You need to complete an auth flow (login via
the admin dashboard or meroctl) and then seed the cache manually:

```python
import json
import os
from calimero_client_py import get_token_cache_path

NODE_NAME = "my-node"

def seed_tokens(access_token: str, refresh_token: str, expires_at: int):
    """Call this once after your first manual login."""
    token_data = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": expires_at
    }
    cache_path = get_token_cache_path(NODE_NAME)
    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    with open(cache_path, "w") as f:
        json.dump(token_data, f)
    os.chmod(cache_path, 0o600)  # secure file permissions
```

## Subsequent runs

Once tokens are cached, `create_client()` loads and uses them automatically:

```python
connection = create_connection(api_url="http://localhost:2428", node_name="my-node")
client = create_client(connection)
# Tokens loaded from ~/.merobox/auth_cache/ — no manual token handling needed
```

## Token refresh

The client automatically retries with a refreshed token on `401 Unauthorized`.
Refreshed tokens are written back to the cache file automatically.

## CI / automated environments

In CI, inject tokens via environment variables and seed the cache before running:

```python
import os

access_token = os.environ["CALIMERO_ACCESS_TOKEN"]
refresh_token = os.environ["CALIMERO_REFRESH_TOKEN"]
seed_tokens(access_token, refresh_token, expires_at=9999999999)
```

Store `CALIMERO_ACCESS_TOKEN` and `CALIMERO_REFRESH_TOKEN` as CI secrets.
