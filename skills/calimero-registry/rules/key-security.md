# Rule: Never commit key.json

The signing key file contains your Ed25519 private key. If committed to version control, anyone with
repo access can sign bundles as you and publish malicious apps under your identity.

## Required steps

```bash
# Immediately after generating your key:
echo "my-key.json" >> .gitignore
echo "*.key.json" >> .gitignore

# Verify it's ignored before committing:
git status  # key.json must NOT appear here
```

## Store your key

- Outside the project directory, or
- In a password manager, or
- In a secrets manager (1Password, Vault, etc.)

## CI/CD

In CI, materialize the key from a secret at build time and point `MERO_SIGN_KEY` at it:

```bash
export MERO_SIGN_KEY="$RUNNER_TEMP/mero-key.json"
printf '%s' "$CALIMERO_SIGNING_KEY" > "$MERO_SIGN_KEY"
cargo mero bundle
```

Store `CALIMERO_SIGNING_KEY` as a repository secret (GitHub Secrets, etc.), never in the repo.

## If you accidentally committed a key

Rotate immediately:

```bash
cargo mero key generate -o new-key.json
# Update your public key in the registry
# Revoke or invalidate the old key
```

A new key is a new `signerId`, and the `signerId` is half of the `ApplicationId`. Rotating forks the
app identity: existing installs will not see bundles signed with the new key as an upgrade.
