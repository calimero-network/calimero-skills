# Bundle Create & Push

## Install

```bash
npm install -g @calimero-network/registry-cli
# or
pnpm add -g @calimero-network/registry-cli
```

## One-time configuration

```bash
calimero-registry config set registry-url https://apps.calimero.network
calimero-registry config set api-key your-api-key
calimero-registry config list
```

Or use environment variables:

```bash
export CALIMERO_REGISTRY_URL=https://apps.calimero.network
export CALIMERO_API_KEY=your-api-key
```

## Bundle create

Creates an `.mpk` bundle from a WASM file:

```bash
calimero-registry bundle create \
  --output myapp-1.0.0.mpk \
  --name "My App" \
  --description "Does something useful" \
  --author "Your Name" \
  --frontend "https://my-app.com" \
  --github "https://github.com/yourorg/myapp" \
  path/to/app.wasm \
  com.yourorg.myapp \
  1.0.0
```

Positional arguments: `<wasm-file> [package] [version]`

| Flag                    | Required | Description                                      |
| ----------------------- | -------- | ------------------------------------------------ |
| `-o, --output <path>`   | No       | Output `.mpk` filename                           |
| `-m, --manifest <path>` | No       | Read metadata from a manifest JSON file          |
| `--name <name>`         | No       | App display name                                 |
| `--description <text>`  | No       | Short description                                |
| `--author <name>`       | No       | Author name                                      |
| `--frontend <url>`      | No       | Frontend URL (Desktop uses this to open the app) |
| `--github <url>`        | No       | Source repository URL                            |
| `--docs <url>`          | No       | Documentation URL                                |

After creating, the CLI prints sign instructions:

```
1. Sign the manifest:  mero-sign sign <output>/manifest.json --key key.json
2. Push the bundle:    calimero-registry bundle push <output> --remote
```

## Bundle push

```bash
# Push to remote registry (uses config file values)
calimero-registry bundle push myapp-1.0.0.mpk --remote

# Push to local registry
calimero-registry bundle push myapp-1.0.0.mpk --local

# Override config
calimero-registry bundle push myapp-1.0.0.mpk \
  --remote \
  --url https://apps.calimero.network \
  --api-key your-api-key
```

## Full publish workflow

```bash
# 1. Build WASM
./build.sh

# 2. Create bundle
calimero-registry bundle create \
  --output myapp-1.0.0.mpk \
  --name "My App" \
  --frontend "https://my-app.com" \
  path/to/app.wasm \
  com.yourorg.myapp \
  1.0.0

# 3. (Optional) Sign manifest for ownership
mero-sign sign myapp-1.0.0/manifest.json --key my-key.json

# 4. Push
calimero-registry bundle push myapp-1.0.0.mpk --remote
```

## Updating an existing app (new version)

```bash
calimero-registry bundle create \
  --output myapp-1.1.0.mpk \
  --name "My App" \
  path/to/app.wasm \
  com.yourorg.myapp \
  1.1.0

calimero-registry bundle push myapp-1.1.0.mpk --remote
```

## CI/CD (GitHub Actions)

```yaml
- name: Install Registry CLI
  run: npm install -g @calimero-network/registry-cli

- name: Create Bundle
  run: |
    calimero-registry bundle create \
      --output app-${{ github.event.release.tag_name }}.mpk \
      --name "My Application" \
      ./app.wasm \
      com.yourorg.myapp \
      ${{ github.event.release.tag_name }}

- name: Publish Bundle
  env:
    CALIMERO_API_KEY: ${{ secrets.CALIMERO_API_KEY }}
  run: |
    calimero-registry bundle push app-${{ github.event.release.tag_name }}.mpk --remote
```
