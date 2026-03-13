# Merobox Workflow Files

Workflow files define reusable network topologies. Commit them to your repo for repeatable local dev and CI environments.

## Minimal workflow

```yaml
# workflow.yml
nodes:
  - name: node1
    port: 2428
  - name: node2
    port: 2429
```

## Full workflow with app deployment

```yaml
# workflow.yml
nodes:
  - name: node1
    port: 2428
  - name: node2
    port: 2429

setup:
  - step: install_app
    node: node1
    bundle: ./dist/myapp.mpk

  - step: create_context
    node: node1
    app_id: "{{ install_app.app_id }}"

  - step: invite_member
    node: node1
    context_id: "{{ create_context.context_id }}"
    identity: "{{ node2.identity }}"

  - step: join_context
    node: node2
    invitation: "{{ invite_member.invitation }}"
```

## Commands

```bash
# Start network
merobox up --workflow workflow.yml

# Start and run setup steps
merobox up --workflow workflow.yml --setup

# Check status
merobox status

# Stop and remove containers
merobox down

# Stop and wipe all data (clean slate)
merobox down --purge
```

## Accessing nodes after startup

Each node exposes its JSON-RPC at the configured port:
- `node1` → `http://localhost:2428`
- `node2` → `http://localhost:2429`

Use `meroctl --node-url http://localhost:2428` to interact with a specific node.
