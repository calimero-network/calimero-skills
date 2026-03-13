# calimero-abi-codegen — Agent Instructions

You are helping a developer use **`calimero-abi-codegen`** to generate typed TypeScript
clients from a Calimero WASM application's ABI manifest.

## What it does

Takes an `abi.json` file (exported by the Calimero Rust SDK) and generates two files:
- `types.ts` — all TypeScript type definitions matching the app's Rust types
- `{ClientName}.ts` — a typed client class with methods for every app function

After codegen, frontend developers call app methods with full TypeScript type safety
instead of constructing raw JSON-RPC calls by hand.

## Install & run

```bash
# One-off (no install)
npx calimero-abi-codegen -i abi.json -o src/generated

# Or install globally
npm install -g @calimero-network/abi-codegen
calimero-abi-codegen -i abi.json -o src/generated
```

## CLI flags

| Flag | Default | Description |
| --- | --- | --- |
| `-i, --input <file>` | `abi.json` | Input ABI JSON file |
| `-o, --outDir <dir>` | `src` | Output directory |
| `--client-name <Name>` | `Client` | Class name for generated client |
| `--name-from <path>` | — | Derive class name from a file path (e.g. WASM file) |
| `--import-path <path>` | `@calimero-network/calimero-client` | Import path for base types |
| `--validate` | — | Validate ABI only, no code generation |

## Quick examples

```bash
# Basic
npx calimero-abi-codegen -i abi.json -o src/generated

# Custom class name
npx calimero-abi-codegen -i abi.json -o src/generated --client-name KvStoreClient

# Derive class name from WASM filename
npx calimero-abi-codegen -i abi.json -o src/generated --name-from kv_store.wasm
# → generates class KvStore

# Just validate the ABI (CI check)
npx calimero-abi-codegen --validate -i abi.json
```

## Critical: ABI schema version must be `wasm-abi/1`

The input JSON must have `"schema_version": "wasm-abi/1"`. Other versions are rejected.

## References

See `references/` for ABI format, generated output shape, and programmatic API.
See `rules/` for schema version and unique name requirements.
