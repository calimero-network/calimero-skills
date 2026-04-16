# calimero-registry — Agent Instructions

You are helping a developer **build and publish a Calimero app bundle** to the App Registry.

## Two tools

| Tool | Install | Purpose |
| --- | --- | --- |
| `calimero-registry` | `npm install -g @calimero-network/registry-cli` | Bundle creation and registry push |
| `mero-sign` | `cargo install mero-sign` | Ed25519 key management and manifest signing (for ownership) |

## Quick workflow

```bash
# 1. Install registry CLI
npm install -g @calimero-network/registry-cli

# 2. Configure registry (one-time)
calimero-registry config set registry-url https://apps.calimero.network
calimero-registry config set api-key your-api-key

# 3. Build WASM (your app's build script)
./build.sh

# 4. Create bundle (WASM + metadata → .mpk)
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

# 5. Push to registry
calimero-registry bundle push myapp-1.0.0.mpk --remote
```

## Signing for ownership (optional but recommended)

The registry tracks package ownership via Ed25519 signatures. If you sign the manifest,
your key becomes the package owner — only your key (or keys in `manifest.owners`) can
push future versions.

```bash
# Generate signing key (one-time)
mero-sign generate-key --output my-key.json
echo "my-key.json" >> .gitignore

# After bundle create, sign the manifest inside the bundle:
mero-sign sign path/to/manifest.json --key my-key.json

# Then push
calimero-registry bundle push myapp-1.0.0.mpk --remote
```

## Bundle create flags

| Flag | Required | Description |
| --- | --- | --- |
| `<wasm-file>` | Yes | Path to WASM binary (positional) |
| `[package]` | Yes | Reverse-domain package name (e.g. `com.yourorg.myapp`) |
| `[version]` | Yes | SemVer version (e.g. `1.0.0`) |
| `-o, --output <path>` | No | Output `.mpk` filename |
| `-m, --manifest <path>` | No | Read config from a manifest JSON file |
| `--name <name>` | No | App display name |
| `--description <text>` | No | Short description |
| `--author <name>` | No | Author name |
| `--frontend <url>` | No | Frontend URL (used by Desktop to open the app) |
| `--github <url>` | No | Source repository URL |
| `--docs <url>` | No | Documentation URL |

## Bundle push flags

```bash
# Push to local registry (default)
calimero-registry bundle push myapp-1.0.0.mpk --local

# Push to remote registry (uses config file)
calimero-registry bundle push myapp-1.0.0.mpk --remote

# Override config with flags
calimero-registry bundle push myapp-1.0.0.mpk \
  --remote \
  --url https://apps.calimero.network \
  --api-key your-api-key
```

## Configuration

```bash
# Set defaults (stored in ~/.calimero-registry/remote-config.json)
calimero-registry config set registry-url https://apps.calimero.network
calimero-registry config set api-key your-api-key
calimero-registry config list

# Or use environment variables
export CALIMERO_REGISTRY_URL=https://apps.calimero.network
export CALIMERO_API_KEY=your-api-key
```

## Package naming rules

- Must be reverse-domain format: `com.yourorg.appname`
- Version must be SemVer without `v` prefix: `1.0.0` not `v1.0.0`

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

## Related skills

- **`calimero-rust-sdk`** — building the WASM app that gets published
- **`calimero-core`** — application/context model and how the registry integrates with node app install

## References

See `references/` for manifest format, signing details, and push workflow.
See `rules/` for hard constraints.
