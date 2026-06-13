# Metadata (group / member / context)

Attach opaque key/value data + a display name to a group, a member, or a
context. Core stores it verbatim (no semantics). Via `AdminApiClient`, camelCase.

## Shape

```ts
interface MetadataRecord {
  name: string | null;
  data: Record<string, string>; // opaque; stored as-is
  updatedAt: number;            // ms epoch
  updatedBy: string;            // hex public key of last writer
}
// Setters take: { name?: string; data?: Record<string,string>; requester?: string }
```

## Group / member / context

```ts
// group
await admin.setGroupMetadata(groupId, { name: 'Engineering', data: { team: 'backend' } });
const g = await admin.getGroupMetadata(groupId);           // MetadataRecord | null

// member (e.g. display name — what chat/design use for "who's who")
await admin.setMemberMetadata(groupId, identity, { name: 'Alice', data: { role: 'lead' } });
const m = await admin.getMemberMetadata(groupId, identity); // MetadataRecord | null

// context
await admin.setContextMetadata(groupId, contextId, { name: 'General', data: {} });
const c = await admin.getContextMetadata(groupId, contextId); // MetadataRecord | null
```

## Server-enforced limits

- `name` ≤ 64 bytes
- ≤ 64 entries in `data`; each key ≤ 64 bytes; each value ≤ 4096 bytes

## Gotchas

- **Whole-map replacement:** the `data` you send replaces the stored map. To
  edit one key, read → spread → write. Omitting `name` preserves the current name.
- A getter returns **null** when no record exists yet — handle it (the wire shape
  for "empty" has varied across versions; mero-js normalizes it to `null`).
- Writing requires the `CAN_MANAGE_METADATA` capability (see
  `capabilities-and-access-control.md`).
- Member metadata is the idiomatic place for a user's **display name** — set it
  right after joining so others don't see a raw public key.
