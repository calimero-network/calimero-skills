# Rule: The 0.x Python client is gone — use `Client`

## What's wrong

Code written for calimero-client-py 0.x (up to 0.9.0) and merod 0.x:

```python
# WRONG: none of this exists in calimero-client-py 1.0 and later
from calimero_client_py import create_connection, create_client

connection = create_connection(api_url="http://localhost:2528", node_name="my-node")
client = create_client(connection)
contexts = client.list_contexts()
client.create_context(application_id="app-id", group_id="group-id")
client.sync_context(context_id="abc123")
```

The 0.x client talked to the peer-to-peer node: contexts, identities and executor keys, JSON-RPC,
JWTs cached under `~/.merobox/auth_cache/` by `node_name`, and syncing with peers. Calimero 1.0
deleted that node, and the package deleted its client in 1.0.0-rc.1.

## What's correct

```python
from calimero_client_py import Client

client = Client.connect("eu-shared-1", tee_profiles=["<profile>"])
client.use_api_key("cal_...")
client.apps.call(app=app_id, method="set", args={"key": "a", "value": "1"})
print(client.apps.view(app=app_id, method="get", args={"key": "a"}).to_dict()["result"])
```

- An app instance (`app`, v1's context) is called by its id; the caller is the API key's or the
  passkey session's account, not an executor key.
- Sessions live in the `Client` object (`client.session()`, `use_session`); nothing is cached on
  disk for you.

## Why

A 0.x name fails at import. Its replacements are listed in the package's CHANGELOG; the route
methods of 1.0.0rc3 and earlier were also renamed (one facade method per route) in 1.0.0rc4.
