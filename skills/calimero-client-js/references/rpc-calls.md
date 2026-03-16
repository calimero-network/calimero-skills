# RPC Calls

Calling application methods on a Calimero node.

## The `rpcClient` singleton

`@calimero-network/calimero-client` exports a pre-configured `rpcClient` singleton.
Import it directly — do not construct `JsonRpcClient` manually.

```typescript
import {
  rpcClient,
  getContextId,
  getExecutorPublicKey,
} from '@calimero-network/calimero-client';
```

---

## Execute a method (mutation or view — same call)

```typescript
const response = await rpcClient.execute<ArgsType, OutputType>({
  contextId: getContextId()!,
  method: 'methodName',
  argsJson: { /* your args */ },
  executorPublicKey: getExecutorPublicKey()!,
});

if (response.error) {
  console.error(response.error.error.cause.info?.message);
} else {
  console.log(response.result?.output);
}
```

---

## Calling a mutation (changes state)

```typescript
const response = await rpcClient.execute<{ key: string; value: string }, void>({
  contextId: getContextId()!,
  method: 'set',
  argsJson: { key: 'hello', value: 'world' },
  executorPublicKey: getExecutorPublicKey()!,
});

if (response.error) {
  console.error('set failed:', response.error.error.cause.info?.message);
}
```

## Calling a view (read-only)

```typescript
const response = await rpcClient.execute<{ key: string }, string | null>({
  contextId: getContextId()!,
  method: 'get',
  argsJson: { key: 'hello' },
  executorPublicKey: getExecutorPublicKey()!,
});

if (!response.error) {
  console.log(response.result?.output); // "world"
}
```

---

## Response shape

```typescript
// Success:
{ result: { output: T } }

// Error:
{
  error: {
    id: number;
    jsonrpc: string;
    code: number;                  // HTTP-like code (400, 401, 500)
    error: {
      name: string;                // e.g. "FunctionCallError"
      cause: {
        name: string;
        info?: { message: string };
      };
    };
    headers?: Record<string, string>;
  }
}
```

---

## Error names

| name | meaning |
|---|---|
| `FunctionCallError` | App method returned an error |
| `RpcExecutionError` | Node couldn't execute the method |
| `InvalidRequestError` | Malformed request (wrong context-id, missing args) |
| `AuthenticationError` | JWT expired, revoked, or missing |
| `UnknownServerError` | Unexpected server error |

---

## Error handling with 401

The HTTP client inside `rpcClient` automatically refreshes tokens on `401 token_expired`.
For `token_revoked` or `invalid_token` you need to re-authenticate:

```typescript
const response = await rpcClient.execute({ ... });

if (response.error) {
  const { code, headers } = response.error;
  const authError = headers?.['x-auth-error'];

  if (code === 401 && (authError === 'token_revoked' || authError === 'invalid_token')) {
    // Token cannot be refreshed — send user to login
    clientLogout();
    return;
  }

  throw new Error(response.error.error.cause.info?.message ?? 'Unknown error');
}
```

---

## Complete example: typed wrapper

```typescript
import {
  rpcClient,
  getContextId,
  getExecutorPublicKey,
} from '@calimero-network/calimero-client';

async function setItem(key: string, value: string): Promise<void> {
  const response = await rpcClient.execute<{ key: string; value: string }, void>({
    contextId: getContextId()!,
    method: 'set',
    argsJson: { key, value },
    executorPublicKey: getExecutorPublicKey()!,
  });
  if (response.error) {
    throw new Error(response.error.error.cause.info?.message);
  }
}

async function getItem(key: string): Promise<string | null> {
  const response = await rpcClient.execute<{ key: string }, string | null>({
    contextId: getContextId()!,
    method: 'get',
    argsJson: { key },
    executorPublicKey: getExecutorPublicKey()!,
  });
  if (response.error) {
    throw new Error(response.error.error.cause.info?.message);
  }
  return response.result?.output ?? null;
}
```
