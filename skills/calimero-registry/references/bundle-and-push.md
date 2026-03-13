# Bundle Create & Push

## calimero-registry CLI

```bash
npm install -g calimero-registry
# or
pnpm add -g calimero-registry
```

## Bundle create

Packages the signed manifest and WASM binary into a `.mpk` file:

```bash
calimero-registry bundle create \
  --output myapp-1.0.0.mpk \
  --name "My App" \
  --description "Does something useful" \
  --author "Your Name" \
  --frontend "https://my-app-frontend.com" \
  --github "https://github.com/yourorg/your-app" \
  path/to/app.wasm \
  com.yourorg.myapp
```

| Flag | Required | Description |
| --- | --- | --- |
| `--output` | Yes | Output `.mpk` filename |
| `--name` | Yes | App display name |
| `--description` | Yes | Short description |
| `--author` | Yes | Author name |
| `--frontend` | No | Frontend URL (used by Desktop) |
| `--github` | No | Source repository URL |

The positional args are: `<wasm-path>` `<app-id>` (reverse-domain, e.g. `com.yourorg.appname`).

## Bundle push

```bash
calimero-registry bundle push myapp-1.0.0.mpk --key my-key.json
```

The registry will:
1. Unpack the `.mpk`
2. Verify the Ed25519 signature against the manifest
3. Validate your authenticated email against org membership (if publishing to an org)
4. Store the bundle and make it discoverable

## On signature mismatch

If the manifest was modified after signing, the push returns:
```
400 invalid_signature
```

Re-sign the manifest and recreate the bundle.

## Updating an existing app (new version)

```bash
# Bump version in manifest.json
mero-sign sign dist/myapp-1.1.0/manifest.json --key my-key.json
calimero-registry bundle create --output myapp-1.1.0.mpk ...
calimero-registry bundle push myapp-1.1.0.mpk --key my-key.json
```

The registry accepts any new semver version. The first publisher of an app name becomes
the owner; only org members can push subsequent versions (validated by email).
