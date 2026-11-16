# Organizations, Teams and Access

Source: core's `protocol/organizations.mdx`. meroctl: `meroctl org ...`, `meroctl team ...`,
`meroctl instance access ...` (commands in `calimero-meroctl`'s `references/orgs-and-teams.md`).

## Organizations

- Every app instance is in exactly one **organization**. Every account owns a **personal
  organization** from sign-up, where an instance created without naming one goes.
- Members have a role: `guest < member < admin < owner`. The creator is the owner.
- Membership changes (roles, removals, leaving, team rows, capabilities) and invites are approved
  with the actor's passkey: the node answers `412 CONFIRM_REQUIRED` with a challenge, and the client
  sends the request again with the assertion, which the log keeps as consent.
- An organization also holds approvals (which mero-tee releases may hold its apps' data, which
  outbound URL prefixes its apps may call), upgrade runs, metadata, and optionally a recovery key
  and a backup key.

## Teams

Teams nest, and are one of two kinds:

- **Open** (`join: everyone`): whoever reaches the parent (at the top, the organization) is a member
  too. Membership flows down an unbroken chain of open teams.
- **Restricted** (`join: invite`): only direct rows. Nothing flows through it.

A direct row has a role (`lead`, `member` or `read-only`) and capabilities. A team's creator leads
it; leads of it or an ancestor, and organization admins, manage it. A member with a **read-only**
row reaches the team's apps, but only views run for them (other calls are `403`).

An **app team** groups a package's instances in an organization (a chat app's channels are
restricted teams below its app team).

## App access

Each instance carries one access rule, set at creation and changed by its owner, an admin, or
whoever manages its team's apps:

| Rule                    | Who reaches the instance                                         |
| ----------------------- | ---------------------------------------------------------------- |
| `owner`                 | the owner only                                                   |
| `accounts { accounts }` | the owner and the listed accounts                                |
| `org` (the default)     | every member of the organization                                 |
| `team { team }`         | the team's members (direct rows and inheritance into open teams) |
| `public`                | anyone, signed in or not                                         |

A caller who does not reach an instance gets `404` (its existence is not disclosed); with no
credential, `401`. The check reads fresh system state, so removing someone holds on every node
before their next request. An owner who leaves the organization (or the instance's team) keeps their
name on it and loses its powers.

```bash
meroctl instance create --name eng-notes --package com.example.notes --org <org-id> --team <team-id>
meroctl instance access eng-notes team --team <team-id>
meroctl instance access eng-notes accounts --account <acct-1> --account <acct-2>
```

Finer rules (who may edit which record) are the app's own code: it reads the caller with
`env::caller()` and their standing with `env::org()`, `env::org_role(account)` and
`env::in_team(account, team)` (see `calimero-rust-sdk`).

## Capabilities

Beyond the role, members hold capability bits, organization-wide (with a default the organization
sets) and per team row: `CREATE_APP`, `INVITE_MEMBERS`, `JOIN_OPEN_TEAMS`, `MANAGE_MEMBERS`,
`MANAGE_APPLICATION` (upgrades, org-wide upgrade runs, outbound approvals), `CREATE_TEAM`,
`DELETE_TEAM`, `MANAGE_VISIBILITY`, `MANAGE_METADATA`, `APPROVE_RELEASES`, `CREATE_CHILD_TEAM`.
Admins and team leads hold them all where they manage.

## Invites

An invite is a token `inv_…` that adds whoever redeems it at a role, optionally into named teams.
Minting it is a passkey step-up; only the token's public key is stored, so the token is shown once.
It expires (7 days by default) and may be limited in uses.

```bash
meroctl org invite <org-id> --role member --team <team-id> --uses 1 --dev-passkey ./dev-passkey.json
meroctl org join inv_...                                   # as the invitee, signed in
```

An app's own frontend cannot mint or accept invites itself: it asks the node's consent page, where
the person approves with their passkey. A session opened on a package's frontend is bound to that
package and is refused organization changes except through that page (see `accounts-and-keys.md`).
