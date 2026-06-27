# RPC Calls

Calling application methods on a Calimero node via `mero.rpc` (mero-js / mero-react).

## The `mero.rpc` client

Get a `MeroJs` instance from `useMero()` (React) or construct one directly
(`new MeroJs({ baseUrl })`). Its `.rpc` getter is a lazily-initialized `RpcClient` — do not
construct `RpcClient` manually.

```typescript
import { useMero } from '@calimero-network/mero-react';

const { mero } = useMero();
// mero.rpc.execute(...)
```

---

## Execute a method (mutation or view — same call)

`execute()` returns the method's **output directly** and **throws** an `RpcError` on failure. There
is no `{ result: { output } }` envelope to unwrap and no `response.error` to check — use
`try/catch`.

```typescript
const output = await mero.rpc.execute<OutputType>({
  contextId,
  method: 'methodName',
  argsJson: {
    /* your args */
  },
});
// `output` is already the unwrapped result
```

`ExecuteParams`:

```typescript
interface ExecuteParams {
  contextId: string;
  method: string;
  argsJson?: Record<string, unknown>;
  /** @deprecated No longer used by the server. Ignored if provided. */
  executorPublicKey?: string;
}
```

> Generated abi-codegen clients still pass `executorPublicKey` for back-compat, but the server
> ignores it. New code can omit it.

---

## Calling a mutation (changes state)

```typescript
await mero.rpc.execute<void>({
  contextId,
  method: 'set',
  argsJson: { key: 'hello', value: 'world' },
});
```

## Calling a view (read-only)

```typescript
const value = await mero.rpc.execute<string | null>({
  contextId,
  method: 'get',
  argsJson: { key: 'hello' },
});
console.log(value); // "world"
```

---

## RpcError

On failure `execute()` throws `RpcError`:

```typescript
import { RpcError } from '@calimero-network/mero-js';

class RpcError extends Error {
  code: number; // JSON-RPC / server error code
  type?: string; // server-specific error type, when present
  data?: unknown; // server-specific error payload
}
```

The underlying JSON-RPC call is `POST /jsonrpc` with
`{ jsonrpc: '2.0', method: 'execute', params: { contextId, method, argsJson } }`. The HTTP client
transparently refreshes the access token on a `401` and retries the request (see
`rules/token-refresh.md`).

---

## Error handling

```typescript
import { RpcError } from '@calimero-network/mero-js';

try {
  const value = await mero.rpc.execute<string | null>({
    contextId,
    method: 'get',
    argsJson: { key: 'hello' },
  });
  // use value
} catch (err) {
  if (err instanceof RpcError) {
    console.error(`RPC failed (${err.code}):`, err.message, err.data);
  } else {
    throw err;
  }
}
```

---

## Complete example: typed wrapper

```typescript
import { MeroJs, RpcError } from '@calimero-network/mero-react';

async function setItem(mero: MeroJs, contextId: string, key: string, value: string): Promise<void> {
  await mero.rpc.execute<void>({
    contextId,
    method: 'set',
    argsJson: { key, value },
  });
}

async function getItem(mero: MeroJs, contextId: string, key: string): Promise<string | null> {
  try {
    return await mero.rpc.execute<string | null>({
      contextId,
      method: 'get',
      argsJson: { key },
    });
  } catch (err) {
    if (err instanceof RpcError) throw new Error(err.message);
    throw err;
  }
}
```

---

> **DEPRECATED:** the old `@calimero-network/calimero-client` `rpcClient` singleton (where
> `execute()` resolved to `{ result: { output }, error }` instead of throwing) is **forbidden** in
> generated apps. Replace `rpcClient.execute(...)` + `response.result.output` / `response.error`
> with `mero.rpc.execute(...)` + `try/catch`.
