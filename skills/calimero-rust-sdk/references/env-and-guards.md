# The env API and guards

`calimero_sdk::env` is an app's view of the host: everything outside its own state. All of it is
deterministic within a logged run.

## The caller and the organization

| Function                      | Returns                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `env::caller()`               | `Caller`: `Account(id)`, `ApiKey { key_id, account }`, `Public`, `System` (the node) or `App(id)`. |
| `env::app_id()`               | This app instance's id.                                                                            |
| `env::app_owner()`            | The account that owns the instance.                                                                |
| `env::org()`                  | The instance's organization, if it has one.                                                        |
| `env::org_role(account)`      | `Option<OrgRole>`: `Guest`, `Member`, `Admin` or `Owner`, ordered.                                 |
| `env::in_team(account, team)` | Whether `account` is in `team`.                                                                    |

| Guard                      | Passes when                                                               |
| -------------------------- | ------------------------------------------------------------------------- |
| `guards::require_member()` | The caller acts for a member of the org, or more; returns the account id. |
| `guards::require_admin()`  | The caller acts for an admin or the owner; returns the account id.        |

Both refuse system, public and app callers with `LoginRequired`, and an account below the role with
`Forbidden`. With no org, the owner holds every role and any other account only `Member`.

```rust,ignore
#[app::confirm]
pub fn remove_item(&mut self, id: String) -> app::Result<()> {
    guards::require_admin()?;
    let _gone = self.items.remove(&id)?;
    Ok(())
}
```

## Time, randomness and ids

| Function                 | Returns                                                                        |
| ------------------------ | ------------------------------------------------------------------------------ |
| `env::time_now()`        | **Milliseconds** since the epoch: the log entry's timestamp.                   |
| `env::random_bytes(len)` | `len` bytes, seeded per logged run.                                            |
| `env::unique_id()`       | A string id unique across the app. Prefer it to a `Counter`.                   |
| `env::applied_index()`   | The log index this run applies on top of.                                      |
| `env::timer()`           | In an `#[app::every]` method, the tick (`scheduled`, `previous`); else `None`. |

## Events, cross-app calls, outbound HTTP, logging

| Function                                   | Does                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| `env::emit(event, audience)`               | Emits an `#[app::event]` value once the call commits (`references/events.md`).   |
| `env::xcall(app, method, &args)`           | A message to another app, delivered after this run commits, only if it succeeds. |
| `env::xcall_call::<T>(app, method, &args)` | Calls another app now and decodes its result. Failure is `XcallFailed`.          |
| `env::xcall_view::<T>(app, method, &args)` | Reads another app now.                                                           |
| `env::fetch(&Request)`                     | Outbound HTTP to an origin the app's owner approved.                             |
| `env::start_action(method, &args)`         | Starts an `#[app::action]` method; returns its key.                              |
| `env::log(message)`                        | A line in the run's log (64 KiB per run). There is no `app::log!`.               |

The target of a cross-app call must be in the same organization (or have the same owner) and allow
the caller with `#[app::allow(app = ..)]`.
