# meroctl Command Reference

Full CLI for managing a running Calimero node.

## Global flags

```bash
meroctl --node-url http://localhost:2428 <command>
meroctl --home ~/.calimero <command>   # alternate config path
```

## App commands

```bash
# Install app from bundle
meroctl app install --path myapp.mpk

# Install app from registry
meroctl app install --url https://registry.calimero.network/myapp/1.0.0

# List installed apps
meroctl app ls

# Get app details
meroctl app get <app-id>

# Remove app (only if no contexts use it)
meroctl app remove <app-id>
```

## Context commands

```bash
# Create context (instance of an app)
meroctl context create --app-id <app-id>

# List contexts
meroctl context ls

# Get context info
meroctl context get <context-id>

# Delete context
meroctl context delete <context-id>

# Invite a member (generates invitation payload)
meroctl context invite <context-id> --identity <identity>

# Join a context (accepts an invitation)
meroctl context join --invitation <invitation-payload>
```

## Identity commands

```bash
# Create a new identity
meroctl identity create

# List identities
meroctl identity ls

# Get identity details
meroctl identity get <identity>
```

## Calling app methods

```bash
# Mutation (changes state)
meroctl call <context-id> set --args '{"key":"hello","value":"world"}'

# View (read-only)
meroctl call <context-id> get --args '{"key":"hello"}' --view
```

## Node health

```bash
meroctl node health
```
