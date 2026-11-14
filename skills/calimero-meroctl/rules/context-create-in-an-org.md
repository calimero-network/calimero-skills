# Rule: `context create` Takes an Organization, Not `--group-id`

**Create a context with `--name` and a package, bundle or file; put it in an organization with
`--namespace ORG` (and a team with `--group TEAM`), or name none for the personal organization.**

## Why

In 0.x a context was bound to a group and `context create` required `--group-id` (with
`--application-id`). Core 1.0 has neither flag. Every app instance is in an organization: the
personal one each account gets at sign-up, or one it created or joined. `--group TEAM` (with
`--namespace`) makes the context reached by that team's members (`access: team`); who reaches it can
change later with `context access`.

## Correct

```bash
meroctl context create --name kv --path kv_store.wasm --alias kv                 # personal org, dev
meroctl context create --name kv --package com.example.kv --version 1.0.0        # an installed release
meroctl context create --name team-kv --package com.example.kv \
  --namespace <org-id> --group <team-id> --params '{"title":"Notes"}'
```

## Wrong

<!-- validate-ignore: no-group-id context-create-application-id context-create-needs-name (intentional WRONG example) -->

```bash
meroctl namespace create --application-id <app-id>
meroctl context create --application-id <app-id> --group-id <namespace-id>
```
