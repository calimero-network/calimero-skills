# Rule: A package is code; an instance is one running copy of it

## What's wrong

Treating the installed application as the thing that holds state, or passing a package name where an
instance is expected:

<!-- validate-ignore: call-needs-instance (intentional WRONG example: a package where an instance goes) -->

```bash
meroctl app install com.example.kv@1.0.0
meroctl call com.example.kv set --args '{"key":"a","value":"1"}'   # WRONG: a package is not an instance
```

## What's correct

| Concept      | What it is                                                        | meroctl            |
| ------------ | ----------------------------------------------------------------- | ------------------ |
| Package      | a signed `.mpk` release (`PACKAGE@VERSION`): code, no state       | `meroctl app`      |
| App instance | one running copy: its own log, state, owner, organization, access | `meroctl instance` |

One package powers many independent instances; state is never shared between them (an instance
reaches another only by a cross-app call). Create an instance, then call it by its alias or app id:

```bash
meroctl app install com.example.kv@1.0.0
meroctl instance create --name notes --package com.example.kv --version 1.0.0 --alias notes
meroctl call -i notes set --args '{"key":"a","value":"1"}'
```

In code, the instance's id is `env::app_id()` in the app, and `app` in client calls
(`client.apps.call({ app, method, args })`). Its context id, `SHA-256(app_id)` in hex, is what SDK
0.12 apps saw; the API takes either.

## Why

v1 called an instance a _context_ and a package an _application_; meroctl spelled the instance
`context` until core 1.0.0-rc.26. Mixing them up sends calls to nothing (`404`) or creates instances
where a call was meant.
