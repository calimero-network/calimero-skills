# Organizations and Teams

`namespace` (alias `ns`) manages organizations; `group` manages an organization's teams. Every
account has a personal organization from sign-up; a context created without `--org` lands there.
Organization roles: `guest`, `member`, `admin`, `owner`. Team roles: `lead`, `member`, `read-only`.
A team's `--join` is `open` (whoever reaches the parent is a member) or `restricted` (only the
members added).

## An organization with a shared app

```bash
ORG=$(meroctl org create Acme | jq -r .orgId)
TEAM=$(meroctl org create-team "$ORG" eng --join restricted | jq -r .teamId)
meroctl instance create --name eng-notes --package com.example.notes \
  --org "$ORG" --team "$TEAM" --alias eng-notes
TOKEN=$(meroctl org invite "$ORG" --role member --team "$TEAM" --uses 1 \
  --dev-passkey ./dev-passkey.json | jq -r .token)
```

The invitee, signed in on their own:

```bash
meroctl org join "$TOKEN"
meroctl call -i <app-id> list --view
```

The answers: `org create` `{ orgId }`, `org create-team` `{ teamId }`, `org invite` `{ token }`,
`instance create` `{ appId, contextId, group, replicas, ... }`.

## namespace

```bash
meroctl org list                                  # this account's orgs, with its role
meroctl org get <org-id>
meroctl org teams <org-id>                       # its teams
meroctl org members list <org-id> --security
meroctl org members add <org-id> <account-id> --role admin      # set-role
meroctl org members remove <org-id> <account-id> --dev-passkey ./dev-passkey.json
meroctl org metadata set <org-id> '{"plan":"team"}'
meroctl org member-metadata <org-id> <account-id> '{"title":"Lead"}'
meroctl org capabilities <org-id> <bits> --team <team-id> --dev-passkey ./dev-passkey.json
meroctl org outbound <org-id> --package com.example.notes --dev-passkey ./dev-passkey.json
meroctl org approve-release <org-id> 2.3.120 --dev-passkey ./dev-passkey.json
meroctl org leave <org-id>
meroctl org delete <org-id> --dev-passkey ./dev-passkey.json
```

## group

```bash
meroctl team get <org-id> <team-id>
meroctl team update <org-id> <team-id> --name platform --join open
meroctl team reparent <org-id> <team-id> <parent-team-id>     # or --top
meroctl team subteams <org-id> <team-id>
meroctl team members list <org-id> <team-id>
meroctl team members add <org-id> <team-id> <account-id> --role lead --dev-passkey ./dev-passkey.json
meroctl team members remove <org-id> <team-id> <account-id> --dev-passkey ./dev-passkey.json
meroctl team settings <org-id> <team-id> --capabilities <bits> --dev-passkey ./dev-passkey.json
meroctl team leave <org-id> <team-id>
meroctl team delete <org-id> <team-id> --dev-passkey ./dev-passkey.json
```

## Upgrading an organization's contexts

```bash
meroctl team upgrade trigger <org-id> --package com.example.notes --version 1.2.0 --dev-passkey ./dev-passkey.json
meroctl team upgrade trigger <org-id> --package com.example.notes --version 1.2.0 --team <team-id> --cascade
meroctl team upgrade status <org-id> <run-id>
meroctl team upgrade retry <org-id> <run-id> --dev-passkey ./dev-passkey.json
```

## Who reaches a context

```bash
meroctl instance access eng-notes org                    # owner | org | team | accounts | public
meroctl instance access eng-notes team --team <team-id>
meroctl instance move eng-notes <other-org-id> --bring-members --dev-passkey ./dev-passkey.json
```
