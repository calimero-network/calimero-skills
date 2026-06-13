# Rule: Application and context are not the same thing

Installing an app and creating a context are two separate operations.

## WRONG — skipping context creation:

```bash
meroctl app install --path myapp.mpk
# ✗ App is installed but there's nothing running yet — no state, no members
```

## CORRECT — install then create context:

```bash
# 1. Install the application (deploy the code)
meroctl app install --path myapp.mpk
# Returns: app-id

# 2. Create a context (instantiate the app)
meroctl context create --app-id <app-id>
# Returns: context-id

# 3. Now you can call methods
meroctl call <context-id> get --args '{"key":"hello"}' --view
```

## Why this matters

API calls take a `context-id`, not an `app-id`. If you try to call a method with an `app-id` instead
of a `context-id` you will get a "context not found" error.

One app can have multiple independent contexts — each with its own members and state. For example, a
chat app might have one context per chat room.
