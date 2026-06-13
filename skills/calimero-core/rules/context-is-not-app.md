# Rule: Application ≠ Context

**An application is not a context. Installing an app does not create a context.**

## What this means

- `meroctl app install` → registers the WASM binary. Returns an `application-id`. No state exists
  yet. No context exists yet.
- `meroctl context create --application-id <id>` → creates a context. Calls `init()`. State now
  exists. The context has a `context-id`.

These are always **two separate commands**. You cannot skip the first step and jump straight to
calling methods.

## Why this matters

When a developer says "install and run my app", the correct sequence is:

```bash
meroctl app install --path app.wasm          # → application-id
meroctl context create --application-id <id> # → context-id
meroctl call <context-id> my_method --args '{}'
```

Not:

```bash
meroctl app install --path app.wasm
meroctl call ???                             # WRONG — no context yet
```

## Analogy

Think of an Application as a class definition and a Context as an instance of that class. You can
have many contexts (instances) from one application (class), each with completely isolated state.
