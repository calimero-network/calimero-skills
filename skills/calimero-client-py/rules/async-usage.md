# Rule: All client methods are async — must be awaited

All `client.*` methods return coroutines. They must be called with `await` inside an
`async` function, and the event loop must be running.

## WRONG:

```python
# ✗ Missing await — returns a coroutine object, not the result
contexts = client.list_contexts()
print(contexts)  # prints <coroutine object ...>

# ✗ Calling outside async context
def main():
    client.list_contexts()  # won't run
```

## CORRECT:

```python
# ✓ Always await
async def main():
    contexts = await client.list_contexts()
    print(contexts)

asyncio.run(main())
```

## In scripts

```python
import asyncio
from calimero_client_py import create_connection, create_client

async def main():
    conn = create_connection(api_url="http://localhost:2428", node_name="dev")
    client = create_client(conn)
    result = await client.execute_function(
        context_id="ctx-id",
        method="get",
        args='{"key":"hello"}',
        executor_public_key="pubkey"
    )
    print(result)

asyncio.run(main())
```

## Note: `create_connection` and `create_client` are synchronous

Only the API methods on the `client` object are async. The setup functions are regular
synchronous calls.
