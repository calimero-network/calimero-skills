# RPC Calls

Calling application methods on a Calimero node.

## Setup

```typescript
import {
  JsonRpcClient,
  getStorageAppEndpointKey,
  getJWTObject,
} from '@calimero-network/calimero-client';

const nodeUrl = getStorageAppEndpointKey() ?? 'http://localhost:2428';
const jwt = getJWTObject();

const client = new JsonRpcClient(nodeUrl, '/jsonrpc', jwt?.access_token);
```

## Calling a mutation (changes state)

```typescript
const response = await client.mutate<{ key: string; value: string }, void>({
  contextId: 'your-context-id',
  method: 'set',
  argsJson: { key: 'hello', value: 'world' },
  executorPublicKey: jwt?.executor_public_key ?? '',
});

if (response.error) {
  console.error(response.error);
}
```

## Calling a view (read-only)

```typescript
const response = await client.query<{ key: string }, string | null>({
  contextId: 'your-context-id',
  method: 'get',
  argsJson: { key: 'hello' },
  executorPublicKey: jwt?.executor_public_key ?? '',
});

console.log(response.result?.output); // "world"
```

## Response shape

```typescript
interface RpcResponse<T> {
  result?: {
    output: T;
  };
  error?: {
    code: number;
    message: string;
  };
}
```

## Error handling

```typescript
const response = await client.query({ ... });

if (response.error) {
  if (response.error.code === 401) {
    // token expired — refresh and retry
    await refreshTokens();
    return callAgain();
  }
  throw new Error(response.error.message);
}
```
