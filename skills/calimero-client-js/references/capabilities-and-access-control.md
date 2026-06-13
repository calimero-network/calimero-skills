# Member capabilities & access control

Per-member permissions in a group/namespace are a **u32 bitmask**. mero-js
exports the bit constants and helpers; the `AdminApiClient` reads/writes them.

## Capability bits

```ts
import { CAPABILITIES, hasCap, withCap, withoutCap } from '@calimero-network/mero-js';

CAPABILITIES.CAN_CREATE_CONTEXT       // 1 << 0  create contexts
CAPABILITIES.CAN_INVITE_MEMBERS       // 1 << 1  invite members
CAPABILITIES.CAN_JOIN_OPEN_SUBGROUPS  // 1 << 2  join open (public) subgroups
CAPABILITIES.MANAGE_MEMBERS           // 1 << 3  add/remove members, update roles
CAPABILITIES.MANAGE_APPLICATION       // 1 << 4  install/uninstall/upgrade app
CAPABILITIES.CAN_CREATE_SUBGROUP      // 1 << 5
CAPABILITIES.CAN_DELETE_SUBGROUP      // 1 << 6
CAPABILITIES.CAN_MANAGE_VISIBILITY    // 1 << 7  subgroup visibility
CAPABILITIES.CAN_MANAGE_METADATA      // 1 << 8  set group/member/context metadata
```

Helpers (all u32-normalized): `hasCap(mask, cap)`, `withCap(mask, cap)`,
`withoutCap(mask, cap)`.

## Read / write a member's capabilities

```ts
const { capabilities } = await admin.getMemberCapabilities(groupId, identity);
const canInvite = hasCap(capabilities, CAPABILITIES.CAN_INVITE_MEMBERS);

// Grant create-context + invite to a member
await admin.setMemberCapabilities(groupId, identity, {
  capabilities: withCap(capabilities, CAPABILITIES.CAN_INVITE_MEMBERS),
  requester: myPublicKey,
});
```

## Defaults for new members

```ts
await admin.setDefaultCapabilities(groupId, {
  defaultCapabilities:
    CAPABILITIES.CAN_CREATE_CONTEXT | CAPABILITIES.CAN_JOIN_OPEN_SUBGROUPS,
  requester: myPublicKey,
});
```

## Subgroup visibility

```ts
await admin.setSubgroupVisibility(groupId, {
  subgroupVisibility: 'public', // 'public' | 'private' | 'inherit'
  requester: myPublicKey,
});
```

## Gotchas

- Core assigns **bits 0–8**; bits 9+ are reserved — never repurpose them in app code.
- Build masks with the helpers / bitwise OR; don't hardcode magic numbers.
- Writes require the *requester* to hold `MANAGE_MEMBERS` (and `CAN_MANAGE_METADATA`
  for metadata) — a member can't grant itself capabilities it lacks.
- A read-only member = capabilities `0` (no bits): can read state, can't mutate
  governance. Use this for "viewer" roles.
