# Build Pipeline

`@calimero-network/calimero-cli-js` compiles your TypeScript app to a `.wasm` binary.

## Pipeline stages

```text
TypeScript  →  Rollup  →  QuickJS  →  WASI-SDK  →  Binaryen  →  .wasm
  Source       Bundle    C bytecode     WASM        Optimized
```

## Setup

```bash
# Install SDK and CLI
pnpm add @calimero-network/calimero-sdk-js
pnpm add -D @calimero-network/calimero-cli-js typescript

# If postinstall didn't run (--ignore-scripts was set):
pnpm install --ignore-scripts=false
# Or manually:
pnpm --filter @calimero-network/calimero-cli-js run install-deps
```

## package.json (minimal)

```json
{
  "dependencies": {
    "@calimero-network/calimero-sdk-js": "^0.1.0"
  },
  "devDependencies": {
    "@calimero-network/calimero-cli-js": "^0.1.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "build": "calimero-sdk build src/index.ts -o build/service.wasm"
  }
}
```

## Build command

```bash
# Build
npx calimero-sdk build src/index.ts -o build/service.wasm

# Or via npm script
pnpm build
```

## Deploy to node

```bash
# Install the app (node-level — no context; --path is the WASM file)
meroctl --node <NODE> app install \
  --path build/service.wasm
# → save the application-id

# Create a new context (runs @Init)
meroctl --node <NODE> context create \
  --application-id <APP_ID>
# → save the context-id

# Call a mutation (method name is positional; context via --context)
meroctl --node <NODE> call set \
  --context <CONTEXT_ID> \
  --args '{"key":"hello","value":"world"}'

# Call a view (same form — read-only methods just read; there is no --view flag)
meroctl --node <NODE> call get \
  --context <CONTEXT_ID> \
  --args '{"key":"hello"}'
```

## End-to-end test with Merobox

Each example in the SDK ships a Merobox workflow for multi-node E2E testing:

```bash
merobox bootstrap run examples/counter/workflows/counter-js.yml --log-level=trace
```

## Platform support

| Platform           | Supported    |
| ------------------ | ------------ |
| macOS (x64, arm64) | Yes          |
| Linux (x64, arm64) | Yes          |
| Windows (native)   | No — use WSL |

## Definition of done (before PR)

1. `pnpm lint` passes
2. `pnpm format:check` passes
3. `pnpm test` passes
4. Example app builds: `cd examples/counter && pnpm build`
