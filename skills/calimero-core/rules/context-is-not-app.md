# Rule: Application ≠ Context

**An application is not a context. Installing an app does not create a context.**

## What this means

- `meroctl app install` → registers the WASM binary. Returns an `application-id`. No state exists
  yet. No context exists yet.
- `meroctl namespace create --application-id <id>` → creates a namespace (the root group) for the
  app. Returns a `namespace-id` (which is also a group id). Still no context.
- `meroctl context create --application-id <id> --group-id <namespace-id>` → creates a context.
  Calls `init()`. State now exists. The context has a `context-id`. `--group-id` is **required** — a
  context is always bound to a group (see `calimero-core/references/namespaces-groups.md`).

These are always **separate commands**. You cannot skip ahead and jump straight to calling methods.

## Why this matters

When a developer says "install and run my app", the correct sequence is:

```bash
meroctl app install --path app.mpk                         # → application-id
meroctl namespace create --application-id <id>             # → namespace-id (root group)
meroctl context create --application-id <id> \
  --group-id <namespace-id>                                # → context-id
meroctl call my_method --context <context-id> --args '{}'  # METHOD positional, --context flag
```

Not:

```bash
meroctl app install --path app.wasm
meroctl call ???                             # WRONG — no context yet
```

## Analogy

Think of an Application as a class definition and a Context as an instance of that class. You can
have many contexts (instances) from one application (class), each with completely isolated state.
