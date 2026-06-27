# Blobs & context identities

Two smaller `AdminApiClient` areas: content-addressed blob storage, and managing the identities
(keypairs) a node holds in a context. camelCase throughout.

## Blobs (content-addressed binary storage)

Store binary the CRDT state shouldn't carry inline (images, files). State holds the returned
`blobId`; the bytes live in blob storage.

```ts
const { blobId, size } = await admin.uploadBlob({ data: new Uint8Array(/* … */) });
// data: Uint8Array | ArrayBuffer | Blob

const { blobs } = await admin.listBlobs(); // [{ blobId, size }]
const info = await admin.getBlobInfo(blobId); // { blobId, size, hash?, mimeType? }
const bytes = await admin.getBlob(blobId); // ArrayBuffer (the raw blob bytes)
const { deleted } = await admin.deleteBlob(blobId); // { blobId, deleted }
```

Pattern: `uploadBlob` → store `blobId` in your app state (e.g. a message's `attachmentId`) → other
peers `getBlob(blobId)` to fetch. Pairs with Rust `FrozenStorage` for immutable, write-once values.

## Context identities

A node can hold multiple identities (Ed25519 keypairs) per context — one per "who am I acting as" in
that context.

```ts
const { publicKey } = await admin.generateContextIdentity(); // new keypair
const { identities } = await admin.getContextIdentities(contextId); // all members' keys
const { identities: owned } = await admin.getContextIdentitiesOwned(contextId); // keys THIS node owns
```

Use `getContextIdentitiesOwned` to resolve **the caller's own identity** in a context (e.g.
`identities[0]`) — the key the local node actually holds. The foundation app uses it as the message
**sender identity** (`msg.sender === myKey` → "is this mine") and feeds it to the generated client,
which still forwards it as the `executorPublicKey` arg on `rpc.execute()`. Note `executorPublicKey`
is `@deprecated` and **ignored by the server** now (see `rpc-calls.md`), so a wrong/foreign value no
longer makes `execute()` fail — but you still want your real owned key for sender/identity logic.

## Gotchas

- `generateContextIdentity` creates the keypair on the node but does **not** add it to a context —
  join/grant it separately before it can execute.
- `getContextIdentities` lists _all_ members; `getContextIdentitiesOwned` lists only the caller's —
  use the latter to choose an executor key.
- Blob ids are content hashes: uploading identical bytes is idempotent; deleting is per-id and
  doesn't cascade to references in state.
