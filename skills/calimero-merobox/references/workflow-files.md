# Merobox Workflow Files

A workflow file is a YAML document that declares a node topology and an ordered list of steps to run
against it. You run it with `merobox bootstrap run <file.yml>`. Commit workflow files to your repo
for repeatable local dev and CI.

## Schema

```yaml
name: My smoke test
description: What this workflow verifies
log_level: info # debug | info | warn | error

# `nodes` is a MAP (not a list). merobox spins up `count` nodes named `<prefix>-1..N`.
nodes:
  count: 2
  prefix: my-node
  image: ghcr.io/calimero-network/merod:edge # used in Docker mode
  base_port: 12428 # P2P / swarm   (node i = base_port + i)
  base_rpc_port: 12528 # JSON-RPC / admin API (node i = base_rpc_port + i)

nuke_on_start: true # wipe node data before the run
nuke_on_end: true # wipe after the run
wait_timeout: 90 # seconds to wait for nodes/sync

# `steps` is an ordered LIST. Each step has a `type:` (the step kind), a human `name:`,
# the target `node:`, type-specific fields, and an optional `outputs:` map that captures
# fields from the step result into named variables for later `{{var}}` interpolation.
steps:
  - type: <step-type>
    name: Human-readable label
    node: my-node-1
    # ...type-specific fields...
    outputs:
      my_var: responseFieldName
```

## Worked example (real two-node app smoke test)

```yaml
name: App smoke
nodes:
  count: 2
  prefix: app-node
  image: ghcr.io/calimero-network/merod:edge
  base_port: 12428
  base_rpc_port: 12528
nuke_on_start: true
nuke_on_end: true
wait_timeout: 90

steps:
  - type: install_application
    name: Install bundle on node 1
    node: app-node-1
    dev: true
    path: ./logic/res/myapp-0.1.0.mpk
    outputs:
      app_id: applicationId

  - type: install_application
    name: Install bundle on node 2
    node: app-node-2
    dev: true
    path: ./logic/res/myapp-0.1.0.mpk

  - type: create_namespace
    name: Create namespace on node 1
    node: app-node-1
    application_id: '{{app_id}}'
    outputs:
      namespace_id: namespaceId

  - type: create_context
    name: Create context on node 1
    node: app-node-1
    application_id: '{{app_id}}'
    group_id: '{{namespace_id}}'
    params: '{"name": "Goa Trip"}'
    outputs:
      ctx: contextId

  - type: create_namespace_invitation
    name: Issue invitation
    node: app-node-1
    namespace_id: '{{namespace_id}}'
    outputs:
      invitation: invitation

  - type: join_namespace
    name: Node 2 joins the namespace
    node: app-node-2
    namespace_id: '{{namespace_id}}'
    invitation: '{{invitation}}'

  - type: wait_for_sync
    name: Let the two nodes sync
    node: app-node-2

  - type: call
    name: Mutate from node 1
    node: app-node-1
    context_id: '{{ctx}}'
    method: create_item
    args: { text: 'hello' }

  - type: json_assert
    name: Node 2 sees the item
    node: app-node-2
    context_id: '{{ctx}}'
    method: list_items
    args: {}
    # json_assert checks the call result against an expected shape
    # (json_equal / json_subset — see the merobox docs for the assertion vocabulary).
```

## Common step types

These are the step types you'll use most (used by real app workflows). The full registry lives in
`merobox/merobox/commands/bootstrap/steps/` — there are many more (groups, proposals, identity,
blobs, mesh/network faults, parallel/repeat/pause, script, restart, …).

| `type:`                       | Purpose                                             | Key fields                                                                                                                   |
| ----------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `install_application`         | Install a bundle on a node                          | `node`, `path`, `dev: true`; `outputs: {app_id: applicationId}`                                                              |
| `create_namespace`            | Create a namespace for an app                       | `node`, `application_id`; `outputs: {namespace_id: namespaceId}`                                                             |
| `create_context`              | Create a context bound to a group                   | `node`, `application_id`, **`group_id`** (required), optional `service_name`, optional `params`; `outputs: {ctx: contextId}` |
| `create_namespace_invitation` | Issue a namespace invitation                        | `node`, `namespace_id`; `outputs: {invitation: invitation}`                                                                  |
| `join_namespace`              | A node joins a namespace via an invitation          | `node`, `namespace_id`, `invitation`                                                                                         |
| `join_context`                | A node joins a single context via an invitation     | `node`, `invitation`                                                                                                         |
| `call`                        | Execute a context method (mutate or view)           | `node`, `context_id`, `method`, `args`                                                                                       |
| `json_assert`                 | Assert a call result matches an expected JSON shape | `node`, `context_id`, `method`, `args`, assertion fields                                                                     |
| `wait_for_sync`               | Pause until nodes have synced                       | `node`, optional timeout                                                                                                     |

> There is **no** `install_app`, `invite_member`, or `setup:` block, and steps are keyed by `type:`,
> not `step:`. Variable capture is per-step `outputs:` → `{{var}}`, not `{{stepname.field}}`.
>
> `create_context`'s `params` is the app's init payload. It must be a JSON **string**, not a YAML
> map — `params: {name: "Goa Trip"}` fails validation, `params: '{"name": "Goa Trip"}'` works.
> `{{var}}` placeholders inside the string are resolved before the JSON is parsed. Its keys match
> the `#[app::init]` argument names in snake_case. A service whose init requires params will panic
> when the context is created without them, so pass `params: '{}'` for an explicit "no params".

## Running a workflow

```bash
# Validate the YAML/schema without starting nodes:
merobox bootstrap run --help        # see all flags
merobox bootstrap validate test/smoke.workflow.yml

# Run it (Docker mode — uses nodes.image):
merobox bootstrap run test/smoke.workflow.yml

# Run with NATIVE merod binaries instead of Docker (no Docker daemon needed):
merobox bootstrap run --no-docker test/smoke.workflow.yml
# optionally point at a specific binary:
merobox bootstrap run --no-docker --binary-path /usr/local/bin/merod test/smoke.workflow.yml
```

## Ports

Each node `i` exposes:

- **P2P / swarm:** `base_port + i` (default base 2428)
- **JSON-RPC / admin API:** `base_rpc_port + i` (default base 2528)

Talk to a node's RPC/admin API on its `base_rpc_port + i` (e.g. `http://localhost:12528`), **not**
the P2P port. Use `meroctl --node <name>` (see the `calimero-meroctl` skill) to interact with a
node.
