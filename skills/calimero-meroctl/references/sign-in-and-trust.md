# Signing In and Trusting a Node

## Trust: which quotes meroctl accepts

meroctl fetches every node's attestation before it sends a request, and refuses a node whose quote
it does not trust.

| Cluster                    | What to pass                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `merod local` (`local up`) | nothing: `local up` saves the node with `--allow-mock`                                |
| another dev node           | `node add NAME URL --allow-mock`, or `--allow-mock` on each command                   |
| a real (TDX) cluster       | `--tee-profiles NAME,...` (else every real quote is refused), `--min-release VERSION` |

`--allow-mock` is a flag only, never read from the environment. `--min-release` defaults to
`2.3.109`; `--allow-debug-profiles` also trusts a release's debug images (the host can read their
memory). `CALIMERO_TEE_PROFILES` and `CALIMERO_MIN_RELEASE` set the others for a shell or CI job.

```bash
meroctl node add prod https://node.example.com
meroctl node use prod
export CALIMERO_TEE_PROFILES=<profile>
meroctl attest                              # the node's attestation document
meroctl attest app kv                       # every replica of an app, verified
```

`meroctl cloud use CLUSTER` saves a Calimero Cloud cluster's node, attested as a real node.

## Credentials

Which credential a command carries: `--api-key` (or `CALIMERO_API_KEY`), else the session saved for
that node's URL (`{home}/meroctl/sessions.json`, refreshed when it nears expiry), else none.

### Development clusters: file passkeys

```bash
meroctl login --dev-passkey ./dev-passkey.json --name ada   # file absent: sign up (and a personal org)
meroctl login --dev-passkey ./dev-passkey.json              # file present: sign in
meroctl whoami
```

A `--dev-passkey` file is a passkey kept on disk, which only a development cluster's `localhost`
relying party accepts; `login` needs `--allow-mock`. The same file approves what an owner approves:

```bash
meroctl namespace invite <org-id> --role member --uses 1 --dev-passkey ./dev-passkey.json
meroctl context update kv --version 1.1.0 --dev-passkey ./dev-passkey.json
```

Without it the node answers `412 CONFIRM_REQUIRED` and nothing changes.
`account device add --dev-passkey NEW --approve-with EXISTING` adds a second file passkey.

### Real clusters: API keys

On a real cluster people sign in with platform passkeys in a browser; meroctl uses an API key made
in the console, and owner approvals happen in the console.

```bash
export CALIMERO_API_KEY=cal_...
meroctl --tee-profiles <profile> whoami
meroctl --tee-profiles <profile> call -c kv get --args '{"key":"a"}' --view
```

From a passkey session you can also mint keys:
`account api-key create [--label L] [--context C]... [--read-only] [--ttl-secs N]` (printed once),
or an upgrade key for CI, `account api-key create --upgrades CONTEXT [--package P]`, which only
moves that context to signed releases with `context update --version`.
