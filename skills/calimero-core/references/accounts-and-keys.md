# Accounts, Passkeys, Sessions and API Keys

Source: core's `protocol/identities.mdx`, `protocol/sessions-and-authority.mdx`,
`protocol/operator.mdx`. There are no context identities, executor keys or JWTs in core 1.0.

## Accounts and passkeys

- An **account** is a person: 32 random bytes (base64url), a display name, up to 10 **passkeys**
  (each one a device) and the account's aliases for instances.
- Passkeys are WebAuthn credentials bound to the cluster's relying party id (`merod --rp-id`) and
  accepted only from its origins (`--origins`, plus a package's served frontend origin). They are
  each cluster's own: one from another cluster answers `401 PASSKEY_UNKNOWN_HERE`.
- Sign up and sign in are passkey ceremonies (`/auth/passkey/register/*`, `/auth/passkey/login/*`).
  Adding a device is approved by a passkey the account already has. An account that lost every
  passkey recovers with its one-time recovery code, which adds a new passkey after 72 hours unless
  an existing passkey cancels it.
- Who may sign up is the cluster's policy (`--sign-up open|invite|closed`).

## Sessions

A session token lasts 15 minutes and is signed by the node that issued it, under its attested
receipt key; any node verifies it without asking the issuer. Signing in also returns a refresh token
(`rt_…`, 30 days), exchanged with `POST /auth/refresh` on any node. A session names the passkey it
was opened with, so removing that passkey ends it.

- **Unbound session**: opened on one of the cluster's own origins (its console, `meroctl login`);
  the account's authority decides what it may do.
- **Package-bound session**: opened on a package's frontend. It reaches only that package's
  instances, and is refused credential management, API keys, approvals, upgrades and organization
  changes; for those the app sends the person to the node's **consent page**, where they approve
  with their passkey.

## API keys

A key `cal_…` acts for an account, for services, scripts and CI. Creating one is a passkey step-up;
only its hash is stored, and the key is shown once. Scopes: `apps` (only these instances),
`methods`, `readOnly`, `allowConfirm` (may relay a passkey assertion for a confirm method; it can
never make one), `ttlSecs` (at most a year).

An **upgrade key** is scoped to one instance's upgrades to signed releases of its package, so CI can
upgrade without a passkey; every other route answers `403 UPGRADE_KEY_ONLY`.

```bash
meroctl account api-key create --label ci --instance kv --read-only --dev-passkey ./dev-passkey.json
meroctl account api-key create --upgrades kv --label deploy --dev-passkey ./dev-passkey.json
CALIMERO_API_KEY=cal_... meroctl call -i kv get --args '{"key":"a"}' --view
```

## Step-ups and confirm methods

Sensitive actions need a fresh passkey assertion over that exact action (a **step-up**): the node
answers `412 CONFIRM_REQUIRED` with a challenge, the client asks the passkey, and sends the request
again. The assertion is logged as consent and spent once. Step-ups cover membership changes,
invites, API keys, upgrades, release and outbound approvals, transfers, and an app's own **confirm
methods** (`#[app::confirm]`), which run only with the caller's passkey. An API key never answers
one (unless `allowConfirm` lets it relay one). On a development cluster, meroctl answers with a file
passkey: `--dev-passkey FILE`.

## What each credential may do

| Action                                         | Passkey session | Package-bound session         | API key       |
| ---------------------------------------------- | --------------- | ----------------------------- | ------------- |
| Call and read instances it reaches             | yes             | that package's instances only | within scope  |
| Install packages, create instances             | yes             | its own package's instances   | unscoped only |
| Manage passkeys, API keys, approvals, upgrades | yes             | no                            | no            |
| Organizations, teams, members, invites         | yes (step-ups)  | through the consent page      | no            |
| A confirm method                               | yes (step-up)   | from its own origin           | relay only    |

## The operator

The operator runs the machines. It holds:

- the **ops token** (`merod --ops-token` or `--ops-token-sha256`), the bearer for the Ops API
  (`/ops/*`): status, placement, nodes, backups, quotas, metrics. The Ops API has no read path into
  apps' data;
- the **operator key**, an Ed25519 key whose public half is recorded at genesis
  (`merod --operator-key`). Every operator decision (registering a node, moving replicas, quotas,
  and the release approvals, upgrades and outbound approvals governance gives the operator) carries
  its signature: the node answers `428 OPERATOR_SIGNATURE_REQUIRED` with the bytes to sign.

Governance (who approves releases, who upgrades apps, who approves outbound prefixes, who may
install) is fixed at the cluster's first start and attested; see `calimero-merod`.
