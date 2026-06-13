# Rule: node_name must be stable and unique per node

`node_name` is used to derive the token cache filename. Changing it between runs means the client
can't find the cached tokens and will fail to authenticate.

## WRONG — dynamic or None:

```python
# ✗ Different every run — tokens never found
connection = create_connection(api_url=url, node_name=str(uuid.uuid4()))

# ✗ None — will error or use a default that collides with other nodes
connection = create_connection(api_url=url, node_name=None)
```

## CORRECT — hardcoded stable string per node:

```python
# ✓ Stable, human-readable, unique to this specific node
connection = create_connection(
    api_url="http://localhost:2428",
    node_name="local-dev-node"
)

# ✓ Or derived from the URL (stable as long as URL doesn't change)
node_name = url.replace("https://", "").replace("/", "-")
connection = create_connection(api_url=url, node_name=node_name)
```

## Why

Token cache files are named `{sanitized_node_name}-{hash}.json` in `~/.merobox/auth_cache/`. If
`node_name` varies, a new cache file is created each run and existing tokens are never reused —
forcing re-authentication on every invocation.

## Also: unique per remote node

If you connect to multiple nodes in the same script, use a different `node_name` for each. Sharing a
`node_name` across two different nodes will mix up their token caches.
