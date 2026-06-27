# Rule: Application and context are not the same thing

Installing an app and creating a context are separate operations (and a context also needs a
namespace/group to bind to).

## WRONG — skipping context creation:

```bash
meroctl app install --path myapp.wasm
# ✗ App is installed but there's nothing running yet — no state, no members
```

## CORRECT — install then create context:

```bash
# 1. Install the application (deploy the code)
meroctl app install --path myapp.wasm
# Returns: application-id

# 2. Create a namespace (root group) for the app
meroctl namespace create --application-id <application-id>
# Returns: namespace-id

# 3. Create a context (instantiate the app) — --group-id is required
meroctl context create --application-id <application-id> --group-id <namespace-id>
# Returns: context-id

# 4. Now you can call methods (method positional, context via --context)
meroctl call get --context <context-id> --args '{"key":"hello"}'
```

## Why this matters

API calls take a `context-id`, not an `application-id`. If you try to call a method with an
`application-id` instead of a `context-id` you will get a "context not found" error.

One app can have multiple independent contexts — each with its own members and state. For example, a
chat app might have one context per chat room.
