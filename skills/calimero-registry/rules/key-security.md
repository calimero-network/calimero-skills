# Rule: Never commit key.json

The signing key file contains your Ed25519 private key. If committed to version control,
anyone with repo access can sign bundles as you and publish malicious apps under your identity.

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

In CI, inject the key via an environment variable and write it to a temp file:

```bash
echo "$CALIMERO_SIGNING_KEY" > /tmp/ci-key.json
mero-sign sign manifest.json --key /tmp/ci-key.json
```

Store `CALIMERO_SIGNING_KEY` as a repository secret (GitHub Secrets, etc.), never in the repo.

## If you accidentally committed a key

Rotate immediately:
```bash
mero-sign generate-key --output new-key.json
# Update your public key in the registry
# Revoke or invalidate the old key
```
