# Rule: ABI manifest must have schema_version "wasm-abi/1"

The codegen tool rejects any ABI file that doesn't have the exact string `"wasm-abi/1"` as its `schema_version`.

## WRONG:

```json
{
  "schema_version": "1",
  "types": {}, "methods": [], "events": []
}
```

```json
{
  "types": {}, "methods": [], "events": []
}
```

## CORRECT:

```json
{
  "schema_version": "wasm-abi/1",
  "types": {}, "methods": [], "events": []
}
```

## Validate before generating

Use `--validate` to check an ABI file without generating code — useful as a CI step:

```bash
npx calimero-abi-codegen --validate -i abi.json
# exits 0 if valid, non-zero if invalid
```
