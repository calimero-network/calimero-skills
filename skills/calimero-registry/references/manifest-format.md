# Manifest Format

`manifest.json` describes the app bundle. mero-sign reads and signs it.

## Minimal manifest

```json
{
  "name": "My App",
  "version": "1.0.0",
  "description": "A short description of what this app does.",
  "repository": "https://github.com/yourorg/your-app",
  "authors": ["Your Name <you@example.com>"],
  "license": "MIT"
}
```

## Full manifest with optional fields

```json
{
  "name": "My App",
  "version": "1.0.0",
  "description": "A short description.",
  "repository": "https://github.com/yourorg/your-app",
  "authors": ["Your Name <you@example.com>"],
  "license": "MIT",
  "links": {
    "frontend": "https://my-app-frontend.com",
    "docs": "https://docs.my-app.com"
  },
  "min_runtime_version": "0.3.0"
}
```

## After signing

mero-sign injects a `signature` block:

```json
{
  "name": "My App",
  "version": "1.0.0",
  ...
  "signature": {
    "alg": "ed25519",
    "pubkey": "yuKE404BaldXazEIUC4XrVGFyXxxyoRVjrrGhcKk1P4",
    "sig": "base64url-64-bytes",
    "signedAt": "2026-03-13T12:00:00Z"
  }
}
```

## Requirements

| Field | Required | Notes |
| --- | --- | --- |
| `name` | Yes | Display name |
| `version` | Yes | Semver — `MAJOR.MINOR.PATCH` |
| `description` | Yes | Short description |
| `repository` | Yes | GitHub or other source URL |
| `links.frontend` | No | Used by Desktop to open the app UI |
| `min_runtime_version` | No | Minimum `merod` version required |
