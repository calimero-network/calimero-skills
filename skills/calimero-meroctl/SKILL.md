# calimero-meroctl — Agent Instructions

You are helping a developer use **`meroctl`**, core 1.0's one command line for Calimero. It makes
and ships apps without a node (`app new|build|codegen|pack|publish`, see `calimero-registry` and
`calimero-abi-codegen`), runs a development cluster (`local`), reaches Calimero Cloud (`cloud`), and
talks to nodes: before it sends anything it fetches the node's attestation and judges the quote,
then every request travels in the sealed channel.

This skill teaches core 1.0's meroctl (1.0.0-rc.24). The 0.x CLI (contexts bound by `--group-id`,
`context identity`, `peers`, JSON-RPC calls, merobox) is gone; see "What changed from 0.x" below.

## Names

meroctl keeps a few older names for the objects the rest of Calimero's docs call otherwise:

| Command     | What it manages                                               |
| ----------- | ------------------------------------------------------------- |
| `app`       | applications: signed packages, installed once per cluster     |
| `context`   | app instances                                                 |
| `namespace` | organizations (alias `ns`)                                    |
| `group`     | an organization's teams                                       |
| `account`   | the signed-in account; each passkey is one of its devices     |
| `local`     | a development cluster on this machine, and the loop around it |
| `cloud`     | Calimero Cloud: organizations, clusters, a cluster's compute  |

## Install

```bash
# meroctl (Linux x86_64/aarch64, macOS aarch64) into ~/.local/bin, checked against SHA256SUMS
curl -fsSL https://raw.githubusercontent.com/calimero-network/core/master/scripts/install.sh | sh

# merod and meroctl, a pinned release
curl -fsSL https://raw.githubusercontent.com/calimero-network/core/master/scripts/install.sh \
  | sh -s -- merod meroctl --version 1.0.0-rc.24

# or Homebrew
brew install calimero-network/tap/meroctl calimero-network/tap/merod
```

## From nothing to a call (development cluster)

```bash
meroctl local up                                     # 3 nodes on 127.0.0.1:2501-2503, saved as node `local`
meroctl login --dev-passkey ./dev-passkey.json --name ada   # a new file signs up
meroctl app build apps/kv-store --out kv_store.wasm    # in a checkout of core
meroctl context create --name kv --path kv_store.wasm --alias kv
meroctl call -c kv set --args '{"key":"a","value":"1"}'
meroctl call -c kv get --args '{"key":"a"}' --view
meroctl context watch kv --limit 1                   # committed events, as JSON lines
meroctl local down
```

`meroctl local dev apps/<app>` does all of that in one command for a project made by
`meroctl app new` and rebuilds on every save. See `references/local-cluster.md`.

## Key facts

- **Output is JSON**, pretty-printed: the route's answer. There is no `--output-format`; pipe to
  `jq`.
- **Which node**: `--api URL`, else `--node ALIAS|URL`, else the default saved node. **Which
  credential**: `--api-key`, else the session saved for that node's URL, else none.
- **A `CONTEXT` argument** is an alias of the signed-in account or an app id (a context id works
  too). `context create --alias` and `context alias add` name one.
- **`call`** is `meroctl call -c CONTEXT METHOD [--args JSON] [--view [--min-index N]]`. `--view` is
  a read (`POST /apps/{app}/views`, no write); without it the call is an intent
  (`POST /apps/{app}/intents`). Both answer `{ index, result, receipt }`. Methods and argument names
  are the ABI's camelCase; a `u64` travels as a decimal string.
- **`context create`** needs `--name` and one of `--package P [--version V]`, `--bundle HASH` or
  `--path FILE`; `--params JSON` feeds `init`, `--namespace ORG [--group TEAM]` puts it in an
  organization (none: the account's personal organization), `--alias` names it.
- **Signing in**: `login --dev-passkey FILE` on a development cluster only (it needs
  `--allow-mock`). On a real cluster, use an API key (`--api-key` or `CALIMERO_API_KEY`) and say
  which images you trust: `--tee-profiles NAME,...` (without it every real quote is refused) and
  optionally `--min-release VERSION` (default `2.3.109`).
- **Owner approvals** (`context update`, `namespace invite`, `account api-key create`, a confirm
  method's `call`, ...) take `--dev-passkey FILE` on a development cluster; without it the node
  answers `412 CONFIRM_REQUIRED`, and on a real cluster the owner approves in the console.
- **Installs**: `app install --path FILE` (a `.mpk`, or a raw `.wasm`) is for development clusters;
  a real cluster installs `app install PACKAGE@VERSION` from its registry.

## What changed from 0.x

| 0.x                                                       | core 1.0                                                                                           |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `context create --application-id A --group-id G`          | `context create --name N (--package P \| --bundle H \| --path F) [--namespace ORG [--group TEAM]]` |
| `namespace create --application-id A` (the root group)    | `namespace create NAME` (an organization; every account also has a personal one)                   |
| `call <ctx> METHOD`, "no `--view` flag"                   | `call -c CONTEXT METHOD --args JSON`, `--view` for reads                                           |
| `POST /jsonrpc` envelope `{ jsonrpc, method: "execute" }` | `meroctl call`, or `POST /apps/{app}/intents` and `/views` (`meroctl raw`, `meroctl proxy`)        |
| `context identity ...`, executor keys, `--as`             | accounts: passkeys (`login`, `account device`) and API keys (`account api-key`)                    |
| `peers`, `context sync`, `group sync`                     | gone: no gossip, each app instance's Raft log replicates it                                        |
| `group join-context`, `namespace join NS INVITE_JSON`     | `namespace join TOKEN`; who reaches a context is its access (`context access`, `--group`)          |
| `node add NAME /path/to/home`, port 2528                  | `node add NAME URL [--allow-mock]`; `local up` serves 2501-2503                                    |
| `--output-format json`                                    | always JSON                                                                                        |
| `context create --watch FILE`                             | `local dev`, `app watch --path FILE --dev-passkey F`, `dev start`                                  |
| merobox                                                   | `meroctl local up\|dev\|test`                                                                      |

## References

- `references/commands.md`: every command group (node, login/attest, app, context, call, blob, file,
  namespace, group, account, cloud, proxy, raw, ops) with its flags.
- `references/local-cluster.md`: `local up|down|status|dev|test`, Docker, and the rc.25 change.
- `references/sign-in-and-trust.md`: sessions, file passkeys, API keys, the trust flags, `attest`.
- `references/orgs-and-teams.md`: organizations, teams, invitations, access.
- `references/scripting.md`: CI and scripts (API keys, `jq`, upgrade keys, `proxy`, `raw`).

## Rules

- `rules/call-view-flag.md`: pass `--view` for reads, `-c` for the context.
- `rules/context-create-in-an-org.md`: no `--group-id`; `--namespace`/`--group` or nothing.
- `rules/dev-passkey-is-dev-only.md`: file passkeys and `--allow-mock` only on development clusters.
- `rules/register-node-once.md`: save a node once, then omit `--node`.
