---
name: calimero-client-py
description:
  'The Python client for Calimero 1.0 (calimero-client-py): connecting with a trust policy, API keys
  and passkeys, calls, views, events, instances, organizations and the Ops API. Use for Python
  scripts, services and operator automation against a Calimero cluster.'
---

# calimero-client-py — Agent Instructions

You are helping a developer call a Calimero 1.0 cluster from **Python**: scripts, backend services,
CI, tests and operator automation, with `calimero-client-py`.

Verified against the published package (`calimero-client-py` 4.0.0 on PyPI: its README, `client.py`
and generated `facade.py`) and core's docs (`build/guides/calling-your-app.mdx`, the e2e `clients`
job). Its source repository was not read; check `help(client.apps)` for anything not shown here.

## What you need to know immediately

- `pip install calimero-client-py` (CPython 3.9+, prebuilt `abi3` wheels). Import
  `from calimero_client_py import Client` (the same classes are re-exported as `calimero`, which the
  typed clients from `meroctl app codegen --lang python` import).
- **Synchronous.** Every method blocks and returns a value; there is no `async`/`await`.
- It wraps core's Rust `calimero-client`: it **attests** the node's TDX quote under your policy,
  **seals** every request, and signs in with a **passkey** or an **API key**.
- **The 0.x client is gone** (up to 0.9.0): `create_connection`, `create_client`, `AuthMode`,
  contexts, identities, JSON-RPC, token caches under `~/.merobox`, `node_name`. Rewrite against
  `Client`.
- Routes are generated from core's OpenAPI document: one keyword-only method per route, grouped as
  `client.auth`, `client.apps`, `client.orgs`, `client.packages`, `client.ops`,
  `client.deployments`, `client.consent`, `client.public`. Each returns a typed model
  (`.to_dict()`); `client.json.<group>` returns the node's JSON as a dict.

## Connect and call

```python
from calimero_client_py import Client, CloudError

# A real cluster: name the image profiles you trust (without them every real quote is refused).
client = Client.connect("eu-shared-1", tee_profiles=["<profile>"])
# One node: Client("https://node1.example.com", tee_profiles=["<profile>"])
# A development cluster (merod local / meroctl local up): Client("http://127.0.0.1:2501", allow_mock=True)

client.use_api_key("cal_...")          # a machine; or client.sign_in(passkey) for a person

r = client.apps.call(app=app_id, method="set", args={"key": "a", "value": "1"},
                     idempotency_key="set-a-1")
v = client.apps.view(app=app_id, method="get", args={"key": "a"}).to_dict()["result"]

for e in client.events(app_id, start=r.index + 1, limit=100, timeout=5):
    print(e["id"], e["kind"], e["data"])
```

Method names and argument names are the app's ABI names (camelCase); `u64`/`i64` travel as decimal
strings. Prefer a typed client: `meroctl app codegen --abi abi.json --lang python -o generated`
(`calimero-abi-codegen`).

## Errors

`CloudError(message, status, code, details)` for every refusal; `LoginRequired` (a `401` a refresh
did not fix) and `WrongNode` (`421 WRONG_NODE` with no other node to try) are subclasses. An app's
own error is `422 APP_ERROR` with `details["code"]`.

## References

- `references/api.md`: the policy, sign-in, passkeys and step-ups, calls and views, events,
  organizations, instances, API keys, the operator.

## Rules

- `rules/no-v1-client.md`: the 0.x Python API is gone.
- `rules/pass-a-trust-policy.md`: `tee_profiles` on real clusters, `allow_mock` only on development
  ones.
