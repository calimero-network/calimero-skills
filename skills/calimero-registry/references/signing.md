# Signing Reference

Every `.mpk` carries an Ed25519 signature over its `manifest.json`. `cargo mero bundle` signs as
part of packaging; `cargo mero sign` signs an existing `manifest.json` in place.

## Generate a key

```bash
cargo mero key generate -o key.json
```

Writes a JSON key file and prints the derived `signerId`:

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

Pass `--force` to overwrite an existing key file; the old key becomes unrecoverable.

To print the `signerId` of a key file without signing anything:

```bash
cargo mero key derive-signer-id -k key.json
```

## Dev key vs production key

`cargo mero bundle --dev` and `cargo mero sign --dev` use a single well-known key baked into the
tool, derived deterministically from `SHA-256("calimero-dev-signing-key-v1")`. Every `--dev` bundle
everywhere resolves to the same signer:

```text
did:key:z6MknF3p5L5FDHJQ7FREUapuX4Wmp4MtF6WrHYaXS2B3eZQd
```

It is the analogue of Android's `debug.keystore`: fine for local installs and CI, but it proves
nothing about provenance, and **the registry refuses bundles signed with it**.

Use `--key <file>` for anything you publish.

## Sign an existing manifest

```bash
cargo mero sign manifest.json --key key.json
# or, for a local-only bundle
cargo mero sign manifest.json --dev
```

The signature block is written into `manifest.json` in place. `--key` and `--dev` are mutually
exclusive, and one of them is required.

## How signing works

```text
  manifest.json (signature field absent or empty)
       │
       ▼  Remove signature + all _* prefixed fields
       ▼  RFC 8785 JSON Canonicalization (sorts all keys recursively)
       ▼  SHA-256(canonical bytes)
       ▼  Ed25519 sign(hash, private_key)
       ▼  Add top-level "signerId" (the did:key) + inject into manifest:
          "signature": {
            "algorithm": "ed25519",
            "publicKey": "base64url-32-bytes",
            "signature": "base64url-64-bytes"
          }
```

`minRuntimeVersion` is filled in (default `0.1.0`) when the manifest does not already carry it.
There is no timestamp field in the signature block.

## The signerId is half of the ApplicationId

The node does not hash the wasm to identify an app. It derives the identity from the manifest's
`package` string and the bundle's `signerId`:

```text
ApplicationId = SHA-256(borsh((package, signerId)))
```

Two consequences follow:

- **Version-stable.** Same `package`, same key, new version gives the same `ApplicationId`, so the
  node treats the new bundle as an upgrade of the existing application.
- **Changing either half forks the identity.** A different `package`, or the same package signed
  with a different key, is a different app to every node. Do not ship `--dev` and then switch to a
  production key: existing installs will not see the re-signed bundle as an upgrade.

Pick the production key before the first published release, and back it up. Losing it means you
cannot publish an in-place upgrade under the same identity.

## CI

Point `cargo mero bundle` at a key file through `MERO_SIGN_KEY` instead of `--key`, so the key is
materialized from a secret at build time and never checked in:

```bash
export MERO_SIGN_KEY="$RUNNER_TEMP/mero-key.json"
echo "$MERO_SIGN_KEY_JSON" > "$MERO_SIGN_KEY"   # from a CI secret
cargo mero bundle
```

## Team workflow

Each developer keeps their own key, but only the package owner's key (or a key listed in
`manifest.owners`) can push new versions of a package. See `references/manifest-format.md` for the
`owners` array.
