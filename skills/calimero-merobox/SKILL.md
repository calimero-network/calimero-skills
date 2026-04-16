# calimero-merobox — Agent Instructions

You are helping a developer set up and test a **local Calimero network** using Merobox.

## What Merobox is

Merobox is a Python CLI tool for running Calimero nodes in Docker containers. It handles:
- Starting/stopping nodes with `merobox run` / `merobox stop`
- App installation and method execution
- Identity and context management
- Automated multi-step test workflows via YAML (`merobox bootstrap run`)
- Multi-node orchestration for integration testing

## Install

```bash
# macOS
brew install merobox

# Ubuntu/Debian
curl -fsSL https://calimero-network.github.io/merobox/gpg.key \
  | sudo tee /usr/share/keyrings/merobox.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/merobox.gpg] https://calimero-network.github.io/merobox stable main" \
  | sudo tee /etc/apt/sources.list.d/merobox.list
sudo apt update && sudo apt install merobox

# pipx (any platform)
pipx install merobox

merobox --version  # verify
```

Requires Docker 20.10+ running.

## Node management

```bash
# Start a node
merobox run --name my-node

# Start with custom ports
merobox run --name my-node --server-port 2428 --swarm-port 2528

# List running nodes
merobox list

# Check node health
merobox health my-node

# View logs
merobox logs my-node
merobox logs my-node --follow   # follow in real-time

# Stop a node
merobox stop my-node

# Delete all node data (destructive)
merobox nuke my-node
```

## App and context management

```bash
# Install a WASM app on a node
merobox install --node my-node --path ./app.wasm --dev

# List installed apps
merobox application list --node my-node

# Create a context
merobox context create --node my-node --application-id <app-id>

# List contexts
merobox context list --node my-node

# Call a method
merobox call my-node <context-id> <method> '{"key":"hello","value":"world"}'
```

## Identity management

```bash
merobox identity generate --node my-node
```

## Blob storage

```bash
merobox blob upload   --node my-node --file ./data.txt
merobox blob list-blobs --node my-node
merobox blob download --node my-node --blob-id <id> --output ./out.txt
merobox blob delete   --node my-node --blob-id <id> --yes
```

## Workflow automation (bootstrap)

Workflows are the most powerful feature — YAML files that orchestrate multi-step scenarios.

```bash
merobox bootstrap run workflow.yml       # execute
merobox bootstrap validate workflow.yml  # validate only
merobox bootstrap create-sample          # scaffold example
```

### Minimal workflow example

```yaml
name: KV Store Test
steps:
  - type: install_application
    node: node-1
    path: ./kv_store.wasm
    outputs:
      app_id: "application_id"

  - type: create_context
    node: node-1
    application_id: "{{app_id}}"
    outputs:
      ctx_id: "context.context_id"

  - type: create_identity
    node: node-1
    outputs:
      pub: "public_key"

  - type: call
    node: node-1
    context_id: "{{ctx_id}}"
    method: set
    args:
      key: "hello"
      value: "world"
    executor_public_key: "{{pub}}"
    outputs:
      result: "output"

  - type: assert
    statements:
      - "is_set({{result}})"
```

### Available step types

| Step | What it does |
|---|---|
| `install_application` | Install WASM app, capture `application_id` |
| `create_context` | Create context, capture `context_id` and `seed` |
| `create_identity` | Create identity, capture `private_key` and `public_key` |
| `join_context` | Join a node to a context (targeted invitation) |
| `invite_open` | Create open invitation (anyone can join) |
| `join_open` | Join via open invitation |
| `call` | Execute app method, capture output |
| `wait` | Sleep N seconds |
| `repeat` | Loop with index variable |
| `assert` | Validate values (`is_set`, `contains`, `==`) |
| `json_assert` | JSON equality/subset checks |
| `upload_blob` | Upload file to blob storage, capture `blob_id` |
| `script` | Run a shell script |
| `fuzzy_test` | Randomized load test (30-60+ min) |

### Multi-node example

```yaml
name: Two-Node Sync Test
steps:
  - type: install_application
    node: node-1
    path: ./app.wasm
    outputs:
      app_id: "application_id"

  - type: create_context
    node: node-1
    application_id: "{{app_id}}"
    outputs:
      ctx: "context.context_id"

  - type: create_identity
    node: node-1
    outputs:
      pub1: "public_key"

  - type: create_identity
    node: node-2
    outputs:
      pub2: "public_key"

  # invite node-2 to join the context
  - type: invite_open
    node: node-1
    context_id: "{{ctx}}"
    granter_id: "{{pub1}}"
    outputs:
      invite: "invitation"

  - type: join_open
    node: node-2
    invitee_id: "{{pub2}}"
    invitation: "{{invite}}"

  - type: wait
    seconds: 2  # allow sync

  - type: call
    node: node-1
    context_id: "{{ctx}}"
    method: set
    args:
      key: "msg"
      value: "hello"
    executor_public_key: "{{pub1}}"

  - type: wait
    seconds: 1

  - type: call
    node: node-2
    context_id: "{{ctx}}"
    method: get
    args:
      key: "msg"
    executor_public_key: "{{pub2}}"
    outputs:
      val: "output"

  - type: assert
    statements:
      - "contains({{val}}, 'hello')"
```

### Auth service (production-like setup)

```yaml
name: Workflow with Auth
auth_service: true  # enables Traefik + auth middleware

nodes:
  count: 1
  prefix: "calimero-node"
  image: "ghcr.io/calimero-network/merod:edge"

steps:
  - type: wait
    seconds: 5
    message: "Waiting for auth service..."
```

Node URL with auth: `http://node1.127.0.0.1.nip.io`

## Variable substitution

```yaml
{{variable_name}}           # step output
{{env.MY_VAR}}              # environment variable
{{iteration}}               # loop index in repeat
{{random_int(1, 100)}}      # random integer
{{random_string(8)}}        # random string
{{uuid}}                    # UUID v4
{{timestamp}}               # Unix timestamp
{{random_node}}             # random node from list
```

## When to use Merobox vs meroctl

| Task | Use |
|---|---|
| Local multi-node dev and testing | Merobox |
| CI pipeline with multi-step scenarios | Merobox |
| Quick single command against a live node | meroctl |
| Managing a production node | meroctl |

## Related skills

- **`calimero-merod`** — `merod` daemon setup (init, ports, health endpoint)
- **`calimero-meroctl`** — full `meroctl` CLI reference for scripting against a live node
- **`calimero-core`** — context/app model and namespace/group participation model

## References

See `references/` for workflow file format, multi-node setup, and CI integration.
