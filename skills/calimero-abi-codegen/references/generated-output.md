# Generated Output

Running `calimero-abi-codegen -i abi.json -o src/generated --client-name KvStoreClient` produces:

```
src/generated/
├── types.ts
└── KvStoreClient.ts
```

## types.ts

Contains all TypeScript types matching the ABI types, plus event payload types:

```typescript
// Generated from abi.json — do not edit manually

export interface Entry {
  key: string;
  value: string;
}

// Event union type
export type AppEvent =
  | { type: 'ItemSet'; payload: Entry }
  | { type: 'ItemRemoved'; payload: { key: string } };
```

## KvStoreClient.ts

Contains the typed client class with a method per ABI function:

```typescript
// Generated from abi.json — do not edit manually
import { CalimeroApp, Context } from '@calimero-network/calimero-client';
import type { Entry } from './types';

export class KvStoreClient {
  constructor(private app: CalimeroApp, private context: Context) {}

  async set(key: string, value: string): Promise<void> {
    await this.app.mutate(this.context, 'set', { key, value });
  }

  async get(key: string): Promise<string | null> {
    return this.app.query(this.context, 'get', { key });
  }

  async entries(): Promise<Entry[]> {
    return this.app.query(this.context, 'entries', {});
  }
}
```

## Using the generated client

```typescript
import { CalimeroApp, Context, getJWTObject, getStorageAppEndpointKey } from '@calimero-network/calimero-client';
import { KvStoreClient } from './generated/KvStoreClient';

const app = new CalimeroApp(getStorageAppEndpointKey(), getJWTObject()?.access_token);
const context = new Context('your-context-id');
const client = new KvStoreClient(app, context);

// Fully typed — IDE autocomplete works
await client.set('hello', 'world');
const value = await client.get('hello'); // string | null
const all = await client.entries();      // Entry[]
```

## Regenerating after app changes

When you update your Rust app and the ABI changes, re-run codegen:

```bash
# After rebuilding your WASM app (which regenerates abi.json):
npx calimero-abi-codegen -i abi.json -o src/generated --client-name KvStoreClient
```

Add this to your build script so it stays in sync automatically:

```json
{
  "scripts": {
    "codegen": "calimero-abi-codegen -i abi.json -o src/generated --client-name KvStoreClient",
    "build": "npm run codegen && tsc"
  }
}
```
