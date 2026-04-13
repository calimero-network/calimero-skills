# Rule: All client methods are synchronous — do NOT use await

Despite being built on an async Rust/Tokio runtime internally, all `client.*` methods
are **synchronous** from Python's perspective. Do NOT use `async`/`await`.

## WRONG:

```python
# ✗ Adding await — methods are not coroutines
async def main():
    contexts = await client.list_contexts()  # TypeError: object is not awaitable
```

## CORRECT:

```python
# ✓ Call methods directly — no await needed
def main():
    conn = create_connection(api_url="http://localhost:2428", node_name="dev")
    client = create_client(conn)
    contexts = client.list_contexts()   # synchronous, returns result directly
    print(contexts)

main()
```

## In scripts

```python
from calimero_client_py import create_connection, create_client
import json

conn = create_connection(api_url="http://localhost:2428", node_name="dev")
client = create_client(conn)

result = client.execute_function(
    context_id="ctx-id",
    method="get",
    args=json.dumps({"key": "hello"}),
    executor_public_key="pubkey"
)
print(result)
```

## Note

The Tokio async runtime is embedded in the Rust bindings and blocks internally.
From Python's view, every call is a normal blocking function call.
