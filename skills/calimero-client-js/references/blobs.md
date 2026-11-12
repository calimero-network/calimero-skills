# Files and blobs

Large bytes go to the cluster's sealed blob store; the app keeps only a `BlobRef` (the blob's
SHA-256) in its state.

```ts
// Upload, then hand the id to an app method that keeps it.
const bytes = new Uint8Array(await file.arrayBuffer());
const { id } = await client.apps.blobUpload({ app: appId, body: bytes, contentType: file.type });
await client.apps.call({ app: appId, method: 'attach', args: { name: file.name, file: id } });

// Download: a Blob with its type, or the bytes.
const blob = await client.apps.blobDownload({ app: appId, id });
const raw = await client.downloadBlob(appId, id);

// With a grant the app returned (`BlobRef::grant(ttl)`), signed in or not.
const shared = await client.downloadBlobGranted(appId, id, grant);
```

- A blob the app drops every reference to is removed.
- A log entry is capped at 1 MiB: never send file contents as method arguments.
