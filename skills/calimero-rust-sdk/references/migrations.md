# Upgrades and state

An upgrade replaces an app's code and keeps its state. The upgrade is an entry in the app's own log;
from that index on, every replica runs the new component against the state the old one wrote.

`calimero-sdk` has **no state migrations** in this version: there is no `#[app::migrate]` that
rewrites stored data during an upgrade. The new code must read what the old code stored.

## Keep the state readable

State lives under keys derived from the `#[app::state]` field names and the table and record
layouts.

- **Safe:** new methods; new events and errors; new state fields (a new key range, empty until
  written); new tables; new indexes on a new table.
- **Not safe:** renaming a state field (its data stays under the old name), changing a field's
  collection or value type, or changing a record's key, fields or field types.

When a shape has to change, add a new field or table beside the old one, write new data there, and
read the old one until it is empty.

## The state version and the release checks

`#[app::state(version = N)]` records `N` in the ABI. Bump it when the state's shape changes.

```bash
meroctl app abi diff old.mpk new.wasm   # what changed; exits 1 on a breaking change
```

`meroctl app pack --previous <last release>` (and `meroctl app sign --previous`) runs the same check
before signing and refuses to sign when a state field was removed or changed kind while the state
version stayed the same.

## Test against the shipped release

Keep each release's signed `.mpk` beside the crate and run a migration scenario from it: the steps
before its `{ "op": "upgrade" }` write state with the shipped code, the steps after read it with the
new code (`references/testing.md`).
