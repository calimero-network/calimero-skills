# Programmatic API

Use the library directly in Node.js scripts for custom code generation pipelines.

## Install

```bash
npm install @calimero-network/abi-codegen
```

## Parse an ABI

```typescript
import { loadAbiManifestFromFile, parseAbiManifest } from '@calimero-network/abi-codegen/parse';

// From file
const manifest = loadAbiManifestFromFile('./abi.json');

// From already-parsed JSON
const json = JSON.parse(fs.readFileSync('./abi.json', 'utf8'));
const manifest = parseAbiManifest(json);
// Throws if invalid — schema_version wrong, dangling refs, duplicate names, etc.
```

## Generate types and client

```typescript
import { generateClient } from '@calimero-network/abi-codegen/generate/client';
import { deriveClientNameFromPath } from '@calimero-network/abi-codegen/generate/emit';

const manifest = loadAbiManifestFromFile('./abi.json');

// Derive the client class name (kv_store.wasm → "KVStoreClient" — ≤2-char parts
// upper-case, "Client" suffix appended)
const clientName = deriveClientNameFromPath('kv_store.wasm');

// Generate the client file content. Types are embedded inline in this single
// file — the third argument overrides the default MeroJs import path.
const clientContent = generateClient(manifest, clientName);
// const clientContent = generateClient(manifest, clientName, '@my/mero-react');

// Write to disk — the CLI emits exactly one file, <ClientName>.ts
fs.writeFileSync(`src/generated/${clientName}.ts`, clientContent);
```

> `generateTypes(manifest)` is also exported (from `@calimero-network/abi-codegen/generate/types`)
> and produces the type definitions on their own, but the CLI does **not** use it — it emits a
> single self-contained `<ClientName>.ts` via `generateClient`. Use `generateTypes` only if you are
> building a custom split-file pipeline.

## Export paths

The package only exposes these subpath exports (see its `package.json#exports`). The root `.`
re-exports the model + parse helpers only; the generators and name helpers live under their own
subpaths:

```typescript
// root (".") — model types + parse helpers
import { parseAbiManifest, loadAbiManifestFromFile } from '@calimero-network/abi-codegen';
// or the dedicated parse subpath
import { loadAbiManifestFromFile, parseAbiManifest } from '@calimero-network/abi-codegen/parse';

import { generateTypes } from '@calimero-network/abi-codegen/generate/types';
import { generateClient } from '@calimero-network/abi-codegen/generate/client';
import {
  deriveClientNameFromPath,
  sanitizeClassName,
} from '@calimero-network/abi-codegen/generate/emit';
```
