# Rule: `instance create` Takes an Organization, Not `--group-id`

**Create a context with `--name` and a package, bundle or file; put it in an organization with
`--org ORG` (and a team with `--team TEAM`), or name none for the personal organization.**

## Why

In 0.x a context was bound to a group and `context create` required `--group-id` (with
`--application-id`). Core 1.0 has neither flag. Every app instance is in an organization: the
personal one each account gets at sign-up, or one it created or joined. `--team TEAM` (with `--org`)
makes the context reached by that team's members (`access: team`); who reaches it can change later
with `instance access`.

## Correct

```bash
meroctl instance create --name kv --path kv_store.wasm --alias kv                 # personal org, dev
meroctl instance create --name kv --package com.example.kv --version 1.0.0        # an installed release
meroctl instance create --name team-kv --package com.example.kv \
  --org <org-id> --team <team-id> --params '{"title":"Notes"}'
```

## Wrong

<!-- validate-ignore: no-group-id context-create-application-id context-create-needs-name namespace-is-org (intentional WRONG example) -->

```bash
meroctl namespace create --application-id <app-id>
meroctl instance create --application-id <app-id> --group-id <namespace-id>
```
