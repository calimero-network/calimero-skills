# calimero-merobox — Agent Instructions

You are helping a developer set up a **local multi-node Calimero network** using Merobox.

## What Merobox is

Merobox is a Docker-based toolchain for running Calimero nodes locally. It handles:
- Spinning up multiple nodes in Docker containers
- Bootstrapping identities and contexts
- Defining reusable network topologies via workflow YAML files
- CI/CD integration

## Install

```bash
# Using pipx (recommended)
pipx install merobox

# macOS with Homebrew
brew install calimero-network/tap/merobox

# Requires: Docker 20.10+ running
```

## Quick start

```bash
# Create a workflow file
cat > workflow.yml << EOF
nodes:
  - name: node1
    port: 2428
  - name: node2
    port: 2429
EOF

# Start the network
merobox up --workflow workflow.yml

# Stop it
merobox down
```

## When to use Merobox vs meroctl

| Task | Use |
| --- | --- |
| Local multi-node dev and testing | Merobox |
| Managing a single production node | meroctl |
| CI pipeline with multi-node scenarios | Merobox |
| One-off command against a live node | meroctl |

## References

See `references/` for workflow file format, multi-node setup, and CI integration.
