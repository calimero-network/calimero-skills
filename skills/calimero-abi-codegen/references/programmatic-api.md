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
import { generateTypes } from '@calimero-network/abi-codegen/generate/types';
import { generateClient } from '@calimero-network/abi-codegen/generate/client';
import { deriveClientNameFromPath } from '@calimero-network/abi-codegen';

const manifest = loadAbiManifestFromFile('./abi.json');

// Generate types.ts content
const typesContent = generateTypes(manifest);

// Generate client content
const clientName = deriveClientNameFromPath('kv_store.wasm'); // → "KvStore"
const clientContent = generateClient(manifest, clientName);

// Write to disk
fs.writeFileSync('src/generated/types.ts', typesContent);
fs.writeFileSync(`src/generated/${clientName}.ts`, clientContent);
```

## Export paths

```typescript
import { deriveClientNameFromPath } from '@calimero-network/abi-codegen';
import { loadAbiManifestFromFile, parseAbiManifest } from '@calimero-network/abi-codegen/parse';
import { generateTypes } from '@calimero-network/abi-codegen/generate/types';
import { generateClient } from '@calimero-network/abi-codegen/generate/client';
```
