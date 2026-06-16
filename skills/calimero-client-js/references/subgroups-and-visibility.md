# Subgroups & visibility (public / private rooms)

A **namespace** is the root group. Inside it you can create **subgroups** — nested
groups that hold their own contexts and membership. Subgroups are how you model
**public vs private rooms / channels / DMs**: the subgroup's *visibility* decides who
may join the context(s) inside it.

> Mental model: namespace = workspace; subgroup = a room/channel; the context inside
> the subgroup = the actual CRDT state peers collaborate on.

## Visibility modes (authoritative)

The node's `VisibilityMode` enum has exactly two values; the wire strings are lowercase:

| Wire value     | Meaning                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------- |
| `'open'`       | **Public** — inherits the parent namespace's members; any namespace member can join.     |
| `'restricted'` | **Private** — admin-gated; a member only joins after being explicitly added/invited.     |

> Older docs/wrappers sometimes say `'public'/'private'/'inherit'` — that is **wrong** for
> the current node. Use `'open'` / `'restricted'`. `getGroupInfo(...).subgroupVisibility`
> returns one of these two strings.

Joining an **open** subgroup requires the member to hold the `CAN_JOIN_OPEN_SUBGROUPS`
capability (bit `1 << 2`) — set it in the namespace's default capabilities so new members
can self-join public rooms. See `capabilities-and-access-control.md`.

## mero-js admin API

```ts
import { MeroJs } from '@calimero-network/mero-js';
const admin = mero.admin;

// 1. Create a subgroup under the namespace (root group).
const { groupId: subgroupId } = await admin.createGroupInNamespace(namespaceId, {
  name: 'design',                       // propagated group name (see metadata.md)
});

// 2. Set its visibility. 'open' = public, 'restricted' = private.
await admin.setSubgroupVisibility(subgroupId, {
  subgroupVisibility: isPublic ? 'open' : 'restricted',
  requester: myPublicKey,
});

// 3. Create the context (the actual app state) INSIDE the subgroup.
const { contextId, memberPublicKey } = await admin.createContext({
  applicationId,
  groupId: subgroupId,                  // ← subgroup, NOT the namespace root
  serviceName: 'room',
  initializationParams: [],
});

// 4. Discover + join.
const subgroups = await admin.listSubgroups(namespaceId);            // SubgroupEntry[] { groupId, name? }
const { subgroupVisibility } = await admin.getGroupInfo(subgroupId); // 'open' | 'restricted'
await admin.joinGroup({ invitation, groupAlias });                   // restricted: via an invitation
// open subgroups: a namespace member with CAN_JOIN_OPEN_SUBGROUPS joins the context directly:
await admin.joinContext(contextId);
```

### Private (restricted) membership

For a **restricted** subgroup, members don't auto-join. Add them explicitly (admin), or
hand out a group invitation:

```ts
await admin.addGroupMembers(subgroupId, { members: [identityA, identityB] });
// or, share a code the invitee redeems:
const inv = await admin.createGroupInvitation(subgroupId, { recursive: true });
// invitee: await admin.joinGroup({ invitation: inv, groupAlias: 'design' });
```

> Adding a member to a restricted subgroup does **not** automatically join them to the
> context inside it — the frontend still calls `joinContext(contextId)` for that member's
> node (mero-chat auto-joins in its `useGroupContexts` hook).

## mero-react hooks (same operations)

```ts
const { createGroupInNamespace } = useCreateGroupInNamespace();
const { setSubgroupVisibility }   = useSetSubgroupVisibility();
const { subgroups }               = useSubgroups(namespaceId);      // SubgroupEntry[]
const { subgroupVisibility }      = useSubgroupVisibility(subgroupId);
const { joinGroup }               = useJoinGroup();
const { addGroupMembers }         = useAddGroupMembers(subgroupId);
const { createGroupInvitation }   = useGroupInvitations();
```

## Pattern: public + private rooms in a chat-style app

```
namespace (workspace)
├── subgroup "general"  visibility=open        → context (everyone in workspace can join)
├── subgroup "random"   visibility=open        → context
└── subgroup "founders" visibility=restricted  → context (only added members)
```

Create-room flow:

```ts
async function createRoom(name: string, isPublic: boolean, invitees: string[]) {
  const { groupId } = await admin.createGroupInNamespace(namespaceId, { name });
  await admin.setSubgroupVisibility(groupId, {
    subgroupVisibility: isPublic ? 'open' : 'restricted',
    requester: myPublicKey,
  });
  const { contextId } = await admin.createContext({
    applicationId, groupId, serviceName: 'room', initializationParams: encodeInit(name),
  });
  if (!isPublic) await admin.addGroupMembers(groupId, { members: invitees });
  return { groupId, contextId };
}
```

Listing rooms a user can see:

```ts
const subs = await admin.listSubgroups(namespaceId);
const rooms = await Promise.all(subs.map(async (s) => {
  const info = await admin.getGroupInfo(s.groupId);          // visibility + memberCount
  const ctxs = await admin.listGroupContexts(s.groupId);     // the room's context(s)
  return { ...s, visibility: info.subgroupVisibility, contextId: ctxs[0]?.contextId };
}));
// 'open' rooms: show to everyone. 'restricted': show only if the caller is a member
// (listSubgroups already filters restricted subgroups the caller can't see).
```

## Why a flat "context-in-the-root-group" model is NOT private

If you create rooms as contexts directly in the **namespace root group** with auto-join
(rather than per-room subgroups), *every namespace member joins every room* — there is no
per-room membership and no privacy. Per-room access control **requires** subgroups +
`setSubgroupVisibility`. (The foundation chat scaffold uses the flat model for simplicity;
switch to subgroups when you need private rooms.)

## Gotchas

- **Visibility strings are `'open'` / `'restricted'`** (not public/private/inherit).
- Set the namespace **default capability** `CAN_JOIN_OPEN_SUBGROUPS` so members can self-join
  public rooms; `CAN_CREATE_SUBGROUP` (1<<5) + `CAN_MANAGE_VISIBILITY` (1<<7) gate who can
  create rooms / flip visibility.
- `createContext` must target the **subgroup** `groupId`, not the namespace root, or the
  room won't be scoped to the subgroup's membership.
- Membership propagation across nodes is eventually-consistent (seconds); poll or use SSE.
- Name a subgroup via `createGroupInNamespace({ name })` **and** propagate it with group
  metadata if you want all members to see the same name (see `metadata.md`).
