# Signing Reference

Every `.mpk` carries an Ed25519 signature over its `manifest.json`. `meroctl app pack` signs as part
of packaging; `meroctl app sign` signs an existing `manifest.json` in place.

## Generate a key

```bash
meroctl app signer new key.json
```

Writes a JSON key file, readable by its owner only (mode `0600`), and prints the derived `signerId`:

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

`meroctl` refuses to sign with a key file that group or others can read: keep it `chmod 600`.

To print the `signerId` of a key file without signing anything:

```bash
meroctl app signer id key.json
```

## Dev key vs production key

`meroctl app pack` without `--key`, and `meroctl app sign --dev`, use a single well-known key baked
into the tool, derived deterministically from `SHA-256("calimero-dev-signing-key-v1")`. Every
dev-signed bundle everywhere resolves to the same signer:

```text
did:key:z6MknF3p5L5FDHJQ7FREUapuX4Wmp4MtF6WrHYaXS2B3eZQd
```

It is the analogue of Android's `debug.keystore`: fine for a development cluster, but it proves
nothing about provenance. **The registry refuses bundles signed with it**, and a node not running
with `--dev` (or `--allow-unsigned-bundles`) refuses to install them (`403 DEV_SIGNED_PACKAGE`).

Use `--key <file>` for anything you publish.

## Sign an existing manifest

```bash
meroctl app sign manifest.json --key key.json
# or, for a local-only bundle
meroctl app sign manifest.json --dev
# report ABI changes against the last release first
meroctl app sign manifest.json --key key.json --previous dist/com.yourorg.myapp-1.0.0.mpk
```

The signature block is written into `manifest.json` in place. `--key` (`-k`) and `--dev` are
mutually exclusive, and one of them is required. `meroctl app pack` does all of this for you; sign
by hand only to add what `pack` writes no field for (multi-service `services`).

## How signing works

```text
  manifest.json (signature field absent or empty)
       │
       ▼  Add top-level "signerId" (the did:key)
       ▼  Remove signature + all _* prefixed fields
       ▼  RFC 8785 JSON Canonicalization (sorts all keys recursively)
       ▼  SHA-256("calimero.bundle.manifest.v1\0" || canonical bytes)
       ▼  Ed25519 sign(hash, private_key)
       ▼  Inject into manifest:
          "signature": {
            "algorithm": "ed25519",
            "publicKey": "base64url-32-bytes",
            "signature": "base64url-64-bytes"
          }
```

Signing refuses a manifest without `minRuntimeVersion` (a signer must not rewrite the document it
signs); `meroctl app pack` always writes it (default `0.1.0`). There is no timestamp field in the
signature block.

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
  with a different key, is a different app to every node. Do not ship a dev-signed bundle and then
  switch to a production key: existing installs will not see the re-signed bundle as an upgrade.

Pick the production key before the first published release, and back it up. Losing it means you
cannot publish an in-place upgrade under the same identity.

## CI

Materialize the key from a secret into an owner-only file at build time, and pass it with `--key`
(there is no environment variable for it):

```bash
key="$RUNNER_TEMP/mero-key.json"
(umask 077 && printf '%s' "$CALIMERO_SIGNING_KEY" > "$key")   # from a CI secret; mode 0600
meroctl app pack logic --key "$key"
```

## Team workflow

Each developer keeps their own key, but only the package owner's key (or a key listed in
`manifest.owners`) can push new versions of a package. See `references/manifest-format.md` for the
`owners` array.
