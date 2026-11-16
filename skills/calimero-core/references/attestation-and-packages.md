# Attestation, the Sealed Channel, and Packages

Source: core's `protocol/tee-attestation.mdx`, `protocol/networking.mdx`,
`protocol/applications.mdx`, `protocol/governance.mdx`.

## Attestation

Before a client sends anything, it fetches the node's TDX quote (`GET /attestation?nonce=…`, in the
clear) and checks it under a **policy** the client gives:

- the quote is genuine (Intel DCAP) and covers the client's nonce and the node's transport key;
- its measurements are listed in a **signed mero-tee release** (the release's
  `published-mrtds.json`, verified with Sigstore) under one of the **profiles** the client trusts;
- that release is no older than a floor (default `2.3.109`). A release's debug profiles are refused
  unless the client allows them.

| Client  | Policy                                                                                   |
| ------- | ---------------------------------------------------------------------------------------- |
| meroctl | `--tee-profiles NAME,...`, `--min-release V`, `--allow-mock` (development only)          |
| mero-js | `policy: { release: { minReleaseVersion }, allowMock }`                                  |
| Python  | `Client(url, tee_profiles=[...], min_release=..., allow_mock=...)`                       |
| Rust    | `calimero_client::Policy { measurements: Measurements::Release { .. }, allow_mock, .. }` |

A development cluster (`merod local`, `merod --dev`) sends **mock** quotes, which a client accepts
only when told to (`--allow-mock`, `allowMock: true`, `allow_mock=True`); nothing reads that from
the environment.

## The sealed channel

After attestation, the client opens a Noise NK session to the attested transport key
(`calimero/sealed-http/v2`) and sends every request inside it: whole HTTP requests, framed
responses. Nothing between the client and the enclave reads them, a TLS-terminating proxy included.
Of the API, only `GET /health` and `GET /attestation` answer in the clear (a non-`--dev` node
refuses any other unsealed request); a package's served frontend and the node's consent page are
pages, served outside the envelope. Peers reach each other over the same kind of channel, attested
the same way.

For tools that speak plain HTTP, `meroctl proxy` serves the node's API on loopback and sends each
request through the sealed channel.

## Receipts

Every call and view answer carries a **receipt**: the answering node's Ed25519 signature over the
app, the log index, the result's hash and the node, under a receipt key its attestation binds.
`meroctl attest app INSTANCE` (`verify_app_cluster` in the Rust and Python clients) attests every
replica of an instance and returns their receipt keys and the governance they all attest.

## Packages and signers

- A **package release** is a signed `.mpk`: a manifest naming the package, its version, its services
  (each a `calimero:app` component, optionally with a compute component), a frontend, pipelines, the
  outbound URL prefixes it declares, `minRuntimeVersion`, and who upgrades its instances (`owner` or
  `publisher`). Every artifact is listed with its digest; the manifest is signed with the
  publisher's Ed25519 key.
- **The signer is pinned by the first release**: a later version signed with another key is refused.
  A package's identity is its package id and its signer (`meroctl app signer`).
- A release travels publisher → registry → each node, never node to node. The installing node
  verifies it before the system log records its hash; each replica fetches and verifies the same
  bytes again before running them. Production nodes install from their registry
  (`meroctl app install PACKAGE@VERSION`); uploads (`--path`) are for development clusters.
- An **upgrade** moves an instance to another release of its package; the state stays and the new
  code reads it. Who approves it is governance (`--app-upgrades owner|operator`).

Building, packing, signing and publishing: `calimero-registry`. The component itself:
`calimero-rust-sdk`.

## Frontends

A package's frontend is served by the cluster from the release itself, at `{label}.{apps-domain}`
(`merod --apps-domain`), one origin per package. A node runs passkey ceremonies only for origins it
knows: its own `--origins`, a frontend it serves from a bundle, or an origin the package's manager
registered (`meroctl app origins add`). A session opened there is bound to the package.

## Release approvals

An instance's data moves only to nodes on a mero-tee release approved for it: by each organization's
owner (`--release-approvals owner`, the default; `meroctl org approve-release`,
`meroctl account approve-release` for one's personal organization) or by the operator
(`meroctl ops release VERSION`). A node on a release the account's owners have not approved answers
`421 WRONG_NODE`; mero-js and the Python client move to the next node they were given.
