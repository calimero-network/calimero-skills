# Testing apps

`calimero-sdk`'s `testing` feature runs the app built as the real `calimero:app` component on the
real wasmtime engine, with an in-memory host. It applies a call's changes only when the call ends
`Ok`, seeds each logged run so tests repeat, and resolves event audiences against the org you give
it. There is no `TestHost` and no native linking of the crate.

Dev-dependencies: `calimero-sdk` with `features = ["testing"]`, `calimero-app-build` (builds the
crate into a component for the test) and `serde_json` (see `SKILL.md`). Core's apps share a small
helper that builds the component once (`apps/kv-store/tests/common`).

## `TestApp`

```rust,ignore
use calimero_sdk::testing::{Org, TestApp};
use serde_json::json;

#[test]
fn set_get_len() {
    let mut t = common::app(Org::new().members(["bob"]));
    t.as_("owner").call("set", json!({ "key": "k", "value": "v" })).unwrap();
    assert_eq!(t.as_("owner").view("get", json!({ "key": "k" })), Ok(json!("v")));
    assert_eq!(t.as_("owner").view("len", json!({})), Ok(json!("1"))); // u64: a decimal string
}
```

- `TestApp::new(component, org, now_ms)` creates the app; `init` runs as the owner.
- `Org::new().admins([..]).members([..]).guests([..]).teams([..])` sets the org the app sees.
- `t.as_(account).call(method, args)` / `.view(..)`: camelCase JSON, as a client sends. The result
  is `Result<Value, Failure>`; `Failure::App { code, fields }` is an app error.
- `t.events_for(account)` lists the events `account` received, in order.
- `t.anonymous()`, `t.system()`, `t.api_key(..)` call as those callers.
- `t.set_time(ms)`, `t.advance(ms)`, `t.tick(timer)`; `t.mock_http(..)`, `t.mock_app(..)`,
  `t.take_xcalls()` / `t.deliver(..)`, `t.add_file(..)` / `t.file(..)`.

## Scenarios

A scenario is a JSON list of steps that the Rust harness, the TypeScript harness and the node's
cluster runner all run. Each `scenarios/<name>.json` runs in the org its `<name>.org.json` names.

```json
[
  {
    "as": "bob",
    "op": "call",
    "method": "getOrInsert",
    "args": { "key": "k", "value": "first" },
    "expect": { "ok": "first" },
    "events": { "bob": ["Inserted"] }
  }
]
```

- `op`: `call`, `view`, `tick`, `advance`, `removeMember`, or `upgrade` in a migration scenario.
- `as`: an account, `"@anonymous"` or `"@system"`; `"confirmed": true` adds the passkey step-up.
- `expect`: `{ "ok": value }`, `{ "error": code, "fields": {..} }`, `{ "trap": .. }`,
  `{ "confirmRequired": true }` or `{ "refused": "<API code>" }`.
- `"save": "id"` stores a result; `"$id"` later in `args` or `expect` is replaced by it.

```rust,ignore
use calimero_sdk::testing::run_scenario;

#[test]
fn every_scenario_passes() {
    for path in common::scenarios() {
        let mut t = common::app(common::org_of(&path));
        run_scenario(&mut t, &path).unwrap_or_else(|e| panic!("{}: {e:#}", path.display()));
    }
}
```

## On a cluster

`merod local` starts a three-node development cluster with mock attestation; install the bundle
there and drive it with `meroctl` or a mero-js client (`policy: { allowMock: true }`). merobox is
not used with core 1.0.
