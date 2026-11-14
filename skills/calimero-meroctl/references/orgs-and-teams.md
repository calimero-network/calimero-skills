# Organizations and Teams

`namespace` (alias `ns`) manages organizations; `group` manages an organization's teams. Every
account has a personal organization from sign-up; a context created without `--namespace` lands
there. Organization roles: `guest`, `member`, `admin`, `owner`. Team roles: `lead`, `member`,
`read-only`. A team's `--join` is `open` (whoever reaches the parent is a member) or `restricted`
(only the members added).

## An organization with a shared app

```bash
ORG=$(meroctl namespace create Acme | jq -r .orgId)
TEAM=$(meroctl namespace create-group "$ORG" eng --join restricted | jq -r .teamId)
meroctl context create --name eng-notes --package com.example.notes \
  --namespace "$ORG" --group "$TEAM" --alias eng-notes
TOKEN=$(meroctl namespace invite "$ORG" --role member --group "$TEAM" --uses 1 \
  --dev-passkey ./dev-passkey.json | jq -r .token)
```

The invitee, signed in on their own:

```bash
meroctl namespace join "$TOKEN"
meroctl call -c <app-id> list --view
```

The answers: `namespace create` `{ orgId }`, `namespace create-group` `{ teamId }`,
`namespace invite` `{ token }`, `context create` `{ appId, contextId, group, replicas, ... }`.

## namespace

```bash
meroctl namespace list                                  # this account's orgs, with its role
meroctl namespace get <org-id>
meroctl namespace groups <org-id>                       # its teams
meroctl namespace members list <org-id> --security
meroctl namespace members add <org-id> <account-id> --role admin      # set-role
meroctl namespace members remove <org-id> <account-id> --dev-passkey ./dev-passkey.json
meroctl namespace metadata set <org-id> '{"plan":"team"}'
meroctl namespace member-metadata <org-id> <account-id> '{"title":"Lead"}'
meroctl namespace capabilities <org-id> <bits> --group <team-id> --dev-passkey ./dev-passkey.json
meroctl namespace outbound <org-id> --package com.example.notes --dev-passkey ./dev-passkey.json
meroctl namespace approve-release <org-id> 2.3.120 --dev-passkey ./dev-passkey.json
meroctl namespace leave <org-id>
meroctl namespace delete <org-id> --dev-passkey ./dev-passkey.json
```

## group

```bash
meroctl group get <org-id> <team-id>
meroctl group update <org-id> <team-id> --name platform --join open
meroctl group reparent <org-id> <team-id> <parent-team-id>     # or --top
meroctl group subgroups <org-id> <team-id>
meroctl group members list <org-id> <team-id>
meroctl group members add <org-id> <team-id> <account-id> --role lead --dev-passkey ./dev-passkey.json
meroctl group members remove <org-id> <team-id> <account-id> --dev-passkey ./dev-passkey.json
meroctl group settings <org-id> <team-id> --capabilities <bits> --dev-passkey ./dev-passkey.json
meroctl group leave <org-id> <team-id>
meroctl group delete <org-id> <team-id> --dev-passkey ./dev-passkey.json
```

## Upgrading an organization's contexts

```bash
meroctl group upgrade trigger <org-id> --package com.example.notes --version 1.2.0 --dev-passkey ./dev-passkey.json
meroctl group upgrade trigger <org-id> --package com.example.notes --version 1.2.0 --group <team-id> --cascade
meroctl group upgrade status <org-id> <run-id>
meroctl group upgrade retry <org-id> <run-id> --dev-passkey ./dev-passkey.json
```

## Who reaches a context

```bash
meroctl context access eng-notes org                    # owner | org | team | accounts | public
meroctl context access eng-notes team --group <team-id>
meroctl context move eng-notes <other-org-id> --bring-members --dev-passkey ./dev-passkey.json
```
