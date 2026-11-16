# calimero-client-py API (core 1.0)

Taken from `calimero-client-py` 4.0.0's README, `client.py` and `facade.py`, and core's "Call your
app from a client" guide. Arguments are keyword-only and snake_case (the route's path, query and
JSON body fields); `help(client.<group>)` lists every method.

## The client and its trust policy

```python
from calimero_client_py import Client

Client(base_url, allow_mock=False, app_hash=None, tee_profiles=None, min_release=None,
       allow_debug_profiles=False, nodes=None, ca_bundle=None)
Client.connect(cluster, *, tee_profiles=None, min_release=None, allow_mock=False, app_hash=None,
               allow_debug_profiles=False, directory=None, zone=None, ca_bundle=None)
```

- `tee_profiles`: a real quote is accepted only from an image whose signed mero-tee release lists it
  under one of these profiles; `min_release` is the floor. Without `tee_profiles`, only mock quotes
  (with `allow_mock=True`) can be accepted.
- `Client.connect("eu-shared-1", ...)` reads the cluster's nodes from the Calimero Cloud directory
  (untrusted: each node is attested before use), prefers `zone`, and fails over between them
  (`client.node_url`, `client.node_urls`).
- `ca_bundle`: a PEM file of extra TLS roots (a staging CA).
- `client.attestation()` is the node's verified attestation; `client.verify_app_cluster(app)`
  attests every replica of an instance and returns their receipt keys.

## Signing in

```python
from calimero_client_py import Client, SoftPasskey

client = Client("http://127.0.0.1:2501", allow_mock=True)
pk = SoftPasskey()                     # an in-memory passkey: development clusters and tests
client.sign_up(pk, "ada")              # a new account; returns the session
client.sign_in(pk)                     # later
client.use_passkey(pk)                 # answers each 412 CONFIRM_REQUIRED with it

service = Client("https://node1.example.com", tee_profiles=["<profile>"])
service.use_api_key("cal_...")         # a machine
```

Also: `refresh()`, `session()`, `use_session(session)`, `add_passkey(new, approver)`, account
recovery (`start_account_recovery(code, passkey)`, `finish_account_recovery(passkey)`). A `401` on a
session is answered by one refresh and a retry; `LoginRequired` only when that fails.

## Calls, views, step-ups

```python
r = client.apps.call(app=app_id, method="set", args={"key": "a", "value": "1"},
                     idempotency_key="set-a-1")             # r.index, r.result, r.events, r.receipt
v = client.apps.view(app=app_id, method="get", args={"key": "a"},
                     consistency="stale", min_index=r.index)
client.apps.call(app=app_id, method="clear", args={}, confirm=pk)   # a #[app::confirm] method
raw = client.json.apps.view(app=app_id, method="get", args={"key": "a"})   # a dict
```

A call is retried with its idempotency key while a node answers `503`, so it runs once. A confirm
method answers `412 CONFIRM_REQUIRED` first: the client's passkey (`use_passkey`) or `confirm=`
answers it; an API key cannot.

## Events and presence

```python
for e in client.events(app_id, start=0, limit=100, timeout=5.0):   # committed, then live
    print(e["id"], e["kind"], e["data"])
for p in client.presence_stream(app_id, limit=100, timeout=5.0):   # the snapshot first
    print(p)
```

`events` returns up to `limit` events, or as many as arrive within `timeout` seconds; read the state
with a view and follow from its `index + 1`.

## Instances, packages, organizations, API keys

```python
client.packages.install(package="com.example.kv", version="1.0.0")      # from the node's registry
app_id = client.apps.create(name="notes", package="com.example.kv", version="1.0.0",
                            org=org_id, init_args={}).app_id
client.apps.list()
client.apps.get(app=app_id)

org_id = client.orgs.create(name="Acme").org_id
token = client.orgs.invite_create(org=org_id, role="member", ttl_secs=86400, uses=1).token
other.orgs.invite_redeem(token=token)
team_id = client.orgs.team_create(org=org_id, name="eng", join="invite").team_id
client.orgs.team_set_member(org=org_id, team=team_id, account=account_id, role="readOnly")

key = client.auth.apikey_create(label="ci", apps=[app_id], read_only=True)   # passkey step-up
```

`apps.create` takes one of `package` (+ `version`, `service`), `bundle` (a hash from
`client.packages.bundle_put(body=wasm)`, development clusters) or `deployment`; `org` (else the
personal organization), `access` (e.g. `{"kind": "team", "team": team_id}`), `init_args`,
`metadata`.

## The operator

```python
ops = Client(node_url, tee_profiles=["<profile>"])
ops.use_api_key(ops_token)                     # the node's ops token
ops.use_operator_key(operator_seed_hex)        # signs each 428 OPERATOR_SIGNATURE_REQUIRED
print(ops.json.ops.status()["nodes"])
ops.ops.register_node(id=4, addr="https://node4.example/", zone="eu1-b")
ops.ops.set_replicas(app=app_id, replicas=[1, 2, 4])
print(ops.ops.backup().written, "snapshots written")
print(Client.operator_public_key(operator_seed_hex))   # what merod --operator-key takes
```

## Not verified here

The client's source repository (calimero-network/calimero-client-py) was not read for this skill;
the signatures above come from the published 4.0.0 wheel. For anything else, check `help()` on the
installed package, its docs site (`https://calimero-network.github.io/calimero-client-py/`) and its
CHANGELOG, which maps every 0.x and pre-1.0.0rc4 name to its replacement.
