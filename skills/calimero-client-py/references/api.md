# Python Client API Reference

> All methods are **synchronous** — no `await` needed. The async Tokio runtime is managed internally
> by the Rust bindings.

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
contexts = client.list_contexts()

# Get a specific context
context = client.get_context(context_id="abc123")

# Create a context (instance of an installed app)
context = client.create_context(
    application_id="app-id",
    protocol="near",          # "near" | "ethereum" | "icp" | "starknet"
    params=None               # optional JSON string
)

# Delete a context
client.delete_context(context_id="abc123")

# Join a context (by context ID)
client.join_context(context_id="abc123")

# Sync a context with peers
client.sync_context(context_id="abc123")

# Sync all contexts
client.sync_all_contexts()
```

## Application management

```python
# List installed apps
apps = client.list_applications()

# Get a specific app
app = client.get_application(app_id="app-id")

# Install from URL (registry or direct)
result = client.install_application(
    url="https://registry.calimero.network/myapp/1.0.0",
    hash=None,        # optional content hash for verification
    metadata=None     # optional bytes
)

# Install from local path (dev mode)
result = client.install_dev_application(
    path="./target/wasm32-unknown-unknown/release/myapp.wasm",
    metadata=None
)

# Uninstall
client.uninstall_application(app_id="app-id")
```

## Calling app methods

```python
import json

# Execute a method (mutation or view)
result = client.execute_function(
    context_id="ctx-id",
    method="set",
    args=json.dumps({"key": "hello", "value": "world"}),
    executor_public_key=identity["public_key"]
)
```

## Identity management

```python
# Generate a new context identity
identity = client.generate_context_identity()
# Returns: { "public_key": "...", "private_key": "..." }

# List identities for a context
identities = client.get_context_identities(context_id="ctx-id")

# Get client keys for a context
keys = client.get_context_client_keys(context_id="ctx-id")
```

## Blob management

```python
blobs = client.list_blobs()
info = client.get_blob_info(blob_id="blob-id")
client.delete_blob(blob_id="blob-id")

# Upload bytes
result = client.upload_blob(data=b"hello", context_id=None)

# Download bytes
data = client.download_blob(blob_id="blob-id", context_id=None)
```

## Alias management

```python
# Create aliases for easier reference
client.create_context_alias(alias="my-context", context_id="ctx-id")
client.create_application_alias(alias="my-app", application_id="app-id")
client.create_context_identity_alias(
    context_id="ctx-id", alias="alice", public_key="pubkey"
)

# Delete aliases
client.delete_context_alias(alias="my-context")
client.delete_context_identity_alias(alias="alice", context_id="ctx-id")

# Lookup / resolve aliases
client.lookup_context_alias(alias="my-context")
client.resolve_context_alias(alias="my-context")
```

## Utility

```python
# Get node API URL
url = client.get_api_url()

# Get connected peers count
peers = client.get_peers_count()

# Get context storage info
storage = client.get_context_storage(context_id="ctx-id")
```
