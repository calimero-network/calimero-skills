# Python Client API Reference

## Setup

```python
from calimero_client_py import create_connection, create_client

connection = create_connection(
    api_url="http://localhost:2428",
    node_name="my-node"   # stable, unique per node
)
client = create_client(connection)
```

## Context management

```python
# List all contexts
contexts = await client.list_contexts()

# Get a specific context
context = await client.get_context(context_id="abc123")

# Create a context (instance of an installed app)
context = await client.create_context(
    application_id="app-id",
    protocol="near",          # "near" | "ethereum" | "icp" | "starknet"
    params=None               # optional JSON string
)

# Delete a context
await client.delete_context(context_id="abc123")

# Sync a context with peers
await client.sync_context(context_id="abc123")

# Sync all contexts
await client.sync_all_contexts()
```

## Application management

```python
# List installed apps
apps = await client.list_applications()

# Get a specific app
app = await client.get_application(app_id="app-id")

# Install from URL (registry or direct)
result = await client.install_application(
    url="https://registry.calimero.network/myapp/1.0.0",
    hash=None,        # optional content hash for verification
    metadata=None     # optional bytes
)

# Install from local path (dev mode)
result = await client.install_dev_application(
    path="./target/wasm32-unknown-unknown/release/myapp.wasm",
    metadata=None
)

# Uninstall
await client.uninstall_application(app_id="app-id")
```

## Calling app methods

```python
import json

# Execute a method (mutation or view)
result = await client.execute_function(
    context_id="ctx-id",
    method="set",
    args=json.dumps({"key": "hello", "value": "world"}),
    executor_public_key=identity["public_key"]
)
```

## Context membership

```python
# Invite a member
invitation = await client.invite_to_context(
    context_id="ctx-id",
    inviter_id="inviter-public-key",
    invitee_id="invitee-public-key"
)

# Join a context (on the invitee's node)
await client.join_context(
    context_id="ctx-id",
    invitee_id="invitee-public-key",
    invitation_payload=invitation["payload"]
)
```

## Identity management

```python
# Generate a new context identity
identity = await client.generate_context_identity()
# Returns: { "public_key": "...", "private_key": "..." }

# List identities for a context
identities = await client.get_context_identities(context_id="ctx-id")

# Get client keys for a context
keys = await client.get_context_client_keys(context_id="ctx-id")
```

## Blob management

```python
blobs = await client.list_blobs()
info = await client.get_blob_info(blob_id="blob-id")
await client.delete_blob(blob_id="blob-id")
```

## Alias management

```python
# Create aliases for easier reference
await client.create_context_alias(alias="my-context", context_id="ctx-id")
await client.create_application_alias(alias="my-app", application_id="app-id")
await client.create_context_identity_alias(
    context_id="ctx-id", alias="alice", public_key="pubkey"
)

# Delete aliases
await client.delete_context_alias(alias="my-context")
await client.delete_context_identity_alias(alias="alice", context_id="ctx-id")
```

## Utility

```python
# Get node API URL
url = client.get_api_url()

# Get connected peers count
peers = await client.get_peers_count()

# Get context storage info
storage = await client.get_context_storage(context_id="ctx-id")
```
