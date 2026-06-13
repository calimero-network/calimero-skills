# mero-sign Reference

Ed25519 key management and manifest signing tool. Source: `calimero-network/core/tools/mero-sign`.

## Install

```bash
# From crates.io (recommended)
cargo install mero-sign

# From source
git clone https://github.com/calimero-network/core
cd core
cargo install --path tools/mero-sign
```

## Generate a signing key

```bash
mero-sign generate-key --output key.json
```

Produces:

```json
{
  "private_key": "PZbZ5yM9t63qOHMM-CCzExbNv8u79XTxZT9UW8GQJ60",
  "public_key": "yuKE404BaldXazEIUC4XrVGFyXxxyoRVjrrGhcKk1P4",
  "signer_id": "did:key:z6Mkt7Ejb12a1BxvRiUpd5YWkMrk8KVjaShW2vMt6trm7FGH"
}
```

| Field         | Description                                                               |
| ------------- | ------------------------------------------------------------------------- |
| `private_key` | Base64url Ed25519 secret (32 bytes). Never share or commit.               |
| `public_key`  | Base64url public key (32 bytes). Embedded in every signed manifest.       |
| `signer_id`   | `did:key` DID representation. Used as identity reference in the registry. |

## Sign a manifest

```bash
mero-sign sign manifest.json --key key.json
# Writes the signature block into manifest.json in-place
```

## How signing works

```text
  manifest.json (signature field absent or empty)
       │
       ▼  Remove signature + all _* prefixed fields
       ▼  RFC 8785 JSON Canonicalization (sorts all keys recursively)
       ▼  SHA-256(canonical bytes)
       ▼  Ed25519 sign(hash, private_key)
       ▼  Inject into manifest:
          {
            "alg":      "ed25519",
            "pubkey":   "base64url-32-bytes",
            "sig":      "base64url-64-bytes",
            "signedAt": "ISO-8601"
          }
```

## Team workflow

Each developer keeps their own key — the registry validates org membership via authenticated email,
not by which key was used.

```bash
# Each developer once:
mero-sign generate-key --output my-key.json
echo "my-key.json" >> .gitignore

# Sign normally — registry links bundle to your org via email
mero-sign sign manifest.json --key my-key.json
```
